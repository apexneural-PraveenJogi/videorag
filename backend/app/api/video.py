"""Video upload, status, and frame-listing routes."""
# NOTE: no `from __future__ import annotations` here — the slowapi @limiter.limit
# wrapper confuses FastAPI's resolution of *string* annotations (it reads the
# wrapper's globals), so we keep annotations as real objects on these endpoints.
import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings, get_settings
from app.dependencies import ALLOWED_VIDEO_TYPES, limiter, settings_dep
from app.models.video import (
    FrameInfo,
    FrameListResponse,
    ProcessingStatus,
    VideoListResponse,
    VideoStatus,
    VideoUploadResponse,
)
from app.pipeline.nodes.ingest_node import ingest_safe
from app.services import status_store, vector_store

router = APIRouter(prefix="/videos", tags=["videos"])

_settings = get_settings()

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize_filename(name: str) -> str:
    """Strip path components and unsafe characters to prevent traversal."""
    base = Path(name or "video").name  # drops any directory parts
    base = _SAFE_NAME.sub("_", base).strip("._") or "video"
    return base[:120]


@router.post("/upload", response_model=VideoUploadResponse)
@limiter.limit(_settings.rate_limit_upload)
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    settings: Settings = Depends(settings_dep),
) -> VideoUploadResponse:
    # Server-side MIME validation (not just extension)
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type '{file.content_type}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_VIDEO_TYPES))}",
        )

    video_id = str(uuid.uuid4())
    safe_name = _sanitize_filename(file.filename or "video")
    video_dir = settings.videos_dir / video_id
    video_dir.mkdir(parents=True, exist_ok=True)
    dest = video_dir / safe_name

    max_bytes = settings.max_video_size_mb * 1024 * 1024
    written = 0
    with dest.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                out.close()
                shutil.rmtree(video_dir, ignore_errors=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds max size of {settings.max_video_size_mb} MB.",
                )
            out.write(chunk)

    if written == 0:
        shutil.rmtree(video_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Empty file.")

    status_store.write_status(
        VideoStatus(
            video_id=video_id, filename=safe_name,
            status=ProcessingStatus.queued, progress=0, stage="Queued",
        )
    )
    background_tasks.add_task(ingest_safe, video_id, str(dest), safe_name)

    return VideoUploadResponse(
        video_id=video_id, filename=safe_name, status=ProcessingStatus.queued
    )


@router.get("", response_model=VideoListResponse)
async def list_videos(settings: Settings = Depends(settings_dep)) -> VideoListResponse:
    """List all videos, newest first (by directory mtime)."""
    videos_dir = settings.videos_dir
    entries: list[tuple[float, VideoStatus]] = []
    if videos_dir.exists():
        for d in videos_dir.iterdir():
            if not d.is_dir() or not (d / "status.json").exists():
                continue
            status = status_store.read_status(d.name)
            if status is not None:
                entries.append((d.stat().st_mtime, status))
    entries.sort(key=lambda e: e[0], reverse=True)
    return VideoListResponse(videos=[s for _, s in entries])


@router.get("/{video_id}", response_model=VideoStatus)
async def get_video(video_id: str) -> VideoStatus:
    status = status_store.read_status(video_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    return status


@router.delete("/{video_id}")
async def delete_video(
    video_id: str, settings: Settings = Depends(settings_dep)
) -> dict:
    """Remove a video's storage, frames, and vector collection. Idempotent: 404
    only if the video never existed."""
    if status_store.read_status(video_id) is None:
        raise HTTPException(status_code=404, detail="Video not found.")

    shutil.rmtree(settings.videos_dir / video_id, ignore_errors=True)
    shutil.rmtree(settings.frames_dir / video_id, ignore_errors=True)
    vector_store.reset_video(video_id)
    return {"deleted": True}


@router.get("/{video_id}/stream")
async def stream_video(
    video_id: str, settings: Settings = Depends(settings_dep)
) -> FileResponse:
    """Serve the stored source video. FileResponse honours HTTP Range requests,
    so the HTML5 player can seek."""
    status = status_store.read_status(video_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Video not found.")

    video_dir = settings.videos_dir / video_id
    # The stored video is the only non-status file in the directory.
    candidates = [
        p for p in video_dir.iterdir()
        if p.is_file() and p.name != "status.json" and not p.name.endswith(".tmp")
    ] if video_dir.exists() else []
    if not candidates:
        raise HTTPException(status_code=404, detail="Video file not found.")

    return FileResponse(candidates[0], filename=status.filename)


@router.get("/{video_id}/frames", response_model=FrameListResponse)
async def list_frames(
    video_id: str, settings: Settings = Depends(settings_dep)
) -> FrameListResponse:
    if status_store.read_status(video_id) is None:
        raise HTTPException(status_code=404, detail="Video not found.")

    frame_dir = settings.frames_dir / video_id
    frames: list[FrameInfo] = []
    if frame_dir.exists():
        for f in sorted(frame_dir.iterdir()):
            if f.suffix.lower().lstrip(".") in ("jpg", "jpeg", "png"):
                # filename pattern frame_<sec>.<ext>
                stem = f.stem.replace("frame_", "")
                try:
                    ts = float(int(stem))
                except ValueError:
                    ts = 0.0
                frames.append(FrameInfo(timestamp=ts, frame_path=f"/frames/{video_id}/{f.name}"))
    return FrameListResponse(video_id=video_id, frames=frames)
