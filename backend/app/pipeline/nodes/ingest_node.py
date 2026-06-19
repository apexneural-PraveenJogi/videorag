"""Ingest: extract frames + transcript, embed, store in ChromaDB.

Run once per video as a background task on upload. Reports progress through the
status store so the frontend can poll a meaningful progress bar.
"""
from __future__ import annotations

import logging
import threading
import time
from pathlib import Path

from app.config import get_settings
from app.models.video import ProcessingStatus
from app.services import status_store, vector_store
from app.services.transcriber import TranscriptSegment, transcribe
from app.services.video_processor import ExtractedFrame, extract_keyframes

logger = logging.getLogger(__name__)

# Limits concurrent heavy ingest jobs (frame extraction + whisper) so several
# uploads don't saturate CPU/RAM at once. Jobs that can't acquire it stay queued.
_ingest_semaphore = threading.Semaphore(get_settings().ingest_concurrency)


def _frame_url(video_id: str, frame_path: Path) -> str:
    return f"/frames/{video_id}/{frame_path.name}"


def _overlapping_text(ts: float, te: float, segments: list[TranscriptSegment]) -> str:
    parts = [s.text for s in segments if s.start <= te and s.end >= ts]
    return " ".join(parts).strip()


def run_ingest(video_id: str, video_path: str, filename: str) -> dict:
    settings = get_settings()
    frames_out = settings.frames_dir / video_id

    status_store.update_status(
        video_id, filename=filename, status=ProcessingStatus.processing,
        progress=5, stage="Extracting keyframes",
    )

    t0 = time.perf_counter()
    logger.info("ingest[%s] extracting keyframes", video_id)
    extraction = extract_keyframes(
        video_path, frames_out, target_fps=settings.frame_extract_fps, fmt=settings.frame_format
    )
    frames: list[ExtractedFrame] = extraction.frames
    logger.info(
        "ingest[%s] extracted %d frames in %.1fs",
        video_id, len(frames), time.perf_counter() - t0,
    )

    status_store.update_status(
        video_id, progress=40, stage="Transcribing audio",
        frame_count=len(frames), duration=extraction.duration,
    )

    t0 = time.perf_counter()
    logger.info("ingest[%s] transcribing audio", video_id)
    try:
        segments = transcribe(video_path, model_size=settings.whisper_model)
    except Exception as exc:  # audio may be absent or whisper unavailable
        segments = []
        status_store.update_status(video_id, stage=f"Transcription skipped: {exc}")
    logger.info(
        "ingest[%s] transcribed %d segments in %.1fs",
        video_id, len(segments), time.perf_counter() - t0,
    )

    status_store.update_status(video_id, progress=70, stage="Indexing in vector store")

    t0 = time.perf_counter()
    logger.info("ingest[%s] indexing in vector store", video_id)
    vector_store.reset_video(video_id)

    ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict] = []

    # Transcript chunks
    for i, seg in enumerate(segments):
        ids.append(f"t-{i}")
        texts.append(seg.text)
        metadatas.append({
            "type": "transcript", "timestamp": seg.start, "end": seg.end, "frame_path": "",
        })

    # Frame chunks, described by overlapping transcript (or a positional fallback)
    frame_window = (1.0 / settings.frame_extract_fps) if settings.frame_extract_fps else 1.0
    for i, fr in enumerate(frames):
        caption = _overlapping_text(fr.timestamp, fr.timestamp + frame_window, segments)
        if not caption:
            caption = f"Video keyframe at {fr.timestamp:.1f} seconds."
        ids.append(f"f-{i}")
        texts.append(caption)
        metadatas.append({
            "type": "frame", "timestamp": fr.timestamp, "end": fr.timestamp,
            "frame_path": _frame_url(video_id, fr.path),
        })

    chunk_count = vector_store.index_items(video_id, ids, texts, metadatas)
    logger.info(
        "ingest[%s] indexed %d chunks in %.1fs",
        video_id, chunk_count, time.perf_counter() - t0,
    )

    status_store.update_status(
        video_id, status=ProcessingStatus.ready, progress=100, stage="Ready",
        frame_count=len(frames), chunk_count=chunk_count, duration=extraction.duration,
        error=None,
    )
    return {"video_id": video_id, "frame_count": len(frames), "chunk_count": chunk_count}


def ingest_safe(video_id: str, video_path: str, filename: str) -> None:
    """Background-task wrapper: never raises; records failures in the status store.

    Bounds concurrency via a module-level semaphore so heavy whisper jobs don't all
    run at once. While waiting to acquire it the video stays in its initial 'queued'
    status; processing is only marked once the slot is held.
    """
    _ingest_semaphore.acquire()
    started = time.perf_counter()
    logger.info("ingest[%s] starting (acquired slot)", video_id)
    try:
        run_ingest(video_id, video_path, filename)
        logger.info(
            "ingest[%s] ready in %.1fs", video_id, time.perf_counter() - started
        )
    except Exception as exc:
        logger.exception("ingest[%s] failed: %s", video_id, exc)
        status_store.update_status(
            video_id, status=ProcessingStatus.failed, stage="Failed", error=str(exc)
        )
    finally:
        _ingest_semaphore.release()
