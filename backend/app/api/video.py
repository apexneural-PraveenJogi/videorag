"""Video upload, status, listing, deletion, and presigned serving — per user."""
# No `from __future__ import annotations` — the slowapi @limiter.limit wrapper
# confuses FastAPI's resolution of string annotations (see api/query.py too).
import os
import re
import tempfile
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.config import Settings, get_settings
from app.db import get_db
from app.dependencies import ALLOWED_VIDEO_TYPES, limiter, settings_dep
from app.models.video import FrameInfo, FrameListResponse, VideoListResponse, VideoStatus, VideoUploadResponse
from app.models_db import User, Video
from app.pipeline.nodes.ingest_node import ingest_safe
from app.services import storage, vector_store

router = APIRouter(prefix="/videos", tags=["videos"])

_settings = get_settings()

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "video")
    base = _SAFE_NAME.sub("_", base).strip("._") or "video"
    return base[:120]


def _owned(db: Session, video_id: str, user: User) -> Video:
    video = db.get(Video, video_id)
    if video is None or video.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Video not found.")
    return video


@router.post("/upload", response_model=VideoUploadResponse)
@limiter.limit(_settings.rate_limit_upload)
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
) -> VideoUploadResponse:
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type '{file.content_type}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_VIDEO_TYPES))}",
        )

    video_id = str(uuid.uuid4())
    safe_name = _sanitize_filename(file.filename or "video")
    max_bytes = settings.max_video_size_mb * 1024 * 1024

    # Stream to a temp file with a hard size cap, then push to S3.
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{safe_name}")
    written = 0
    try:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_video_size_mb} MB.")
            tmp.write(chunk)
        tmp.close()
        if written == 0:
            raise HTTPException(status_code=400, detail="Empty file.")

        key = storage.video_key(user.id, video_id, safe_name)
        storage.upload_file(tmp.name, key, content_type=file.content_type)
    finally:
        tmp.close()
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    db.add(Video(id=video_id, owner_id=user.id, filename=safe_name, status="queued", stage="Queued", video_key=key))
    db.commit()

    background_tasks.add_task(ingest_safe, video_id, user.id, key, safe_name)
    return VideoUploadResponse(video_id=video_id, filename=safe_name, status="queued")


@router.get("", response_model=VideoListResponse)
def list_videos(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> VideoListResponse:
    rows = db.scalars(
        select(Video).where(Video.owner_id == user.id).order_by(Video.created_at.desc())
    ).all()
    return VideoListResponse(videos=[VideoStatus(**v.to_status()) for v in rows])


@router.get("/{video_id}", response_model=VideoStatus)
def get_video(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> VideoStatus:
    return VideoStatus(**_owned(db, video_id, user).to_status())


@router.delete("/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    video = _owned(db, video_id, user)
    try:
        storage.delete_prefix(storage.video_prefix(user.id, video_id))
        storage.delete_prefix(storage.frames_prefix(user.id, video_id))
    except Exception:  # noqa: BLE001 — best-effort cleanup
        pass
    vector_store.reset_video(video_id)
    db.delete(video)
    db.commit()
    return {"deleted": True}


@router.get("/{video_id}/stream-url")
def stream_url(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    video = _owned(db, video_id, user)
    if not video.video_key:
        raise HTTPException(status_code=404, detail="Video file not found.")
    return {"url": storage.presigned_url(video.video_key)}


@router.get("/{video_id}/frames", response_model=FrameListResponse)
def list_frames(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> FrameListResponse:
    _owned(db, video_id, user)
    frames: list[FrameInfo] = []
    for key in sorted(storage.list_keys(storage.frames_prefix(user.id, video_id))):
        name = key.rsplit("/", 1)[-1]
        if name.rsplit(".", 1)[-1].lower() not in ("jpg", "jpeg", "png"):
            continue
        stem = name.rsplit(".", 1)[0].replace("frame_", "")
        try:
            ts = float(int(stem))
        except ValueError:
            ts = 0.0
        frames.append(FrameInfo(timestamp=ts, frame_path=storage.presigned_url(key)))
    frames.sort(key=lambda f: f.timestamp)
    return FrameListResponse(video_id=video_id, frames=frames)
