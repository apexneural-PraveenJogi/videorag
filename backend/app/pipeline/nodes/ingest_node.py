"""Ingest: pull the source video from S3, extract frames + transcript, embed,
store in ChromaDB, and push frames back to S3.

Runs once per video as a background task on upload. Progress is reported through
the videos table so the frontend can poll a meaningful progress bar.
"""
from __future__ import annotations

import concurrent.futures
import logging
import tempfile
import threading
import time
from pathlib import Path

from app.config import get_settings
from app.services import storage, vector_store, video_repo
from app.services.captioner import caption_frame
from app.services.chunker import chunk_segments
from app.services.transcriber import TranscriptSegment, transcribe
from app.services.video_processor import ExtractedFrame, extract_keyframes

logger = logging.getLogger(__name__)

# Limits concurrent heavy ingest jobs (frame extraction + whisper) so several
# uploads don't saturate CPU/RAM at once. Jobs that can't acquire it stay queued.
_ingest_semaphore = threading.Semaphore(get_settings().ingest_concurrency)

# Errors worth retrying (network / storage / embedding hiccups), vs. permanent
# failures like a corrupt/undecodable video.
_TRANSIENT = (ConnectionError, TimeoutError, OSError)


def _overlapping_text(ts: float, te: float, segments: list[TranscriptSegment]) -> str:
    parts = [s.text for s in segments if s.start <= te and s.end >= ts]
    return " ".join(parts).strip()


def run_ingest(video_id: str, owner_id: str, video_key: str, filename: str) -> dict:
    settings = get_settings()

    with tempfile.TemporaryDirectory(prefix=f"ingest_{video_id}_") as tmp:
        tmp_dir = Path(tmp)
        local_video = tmp_dir / filename
        frames_out = tmp_dir / "frames"

        video_repo.update_video(video_id, status="processing", progress=5, stage="Downloading")
        storage.download_to_file(video_key, local_video)

        video_repo.update_video(video_id, progress=15, stage="Extracting keyframes")
        t0 = time.perf_counter()
        extraction = extract_keyframes(
            local_video, frames_out, target_fps=settings.frame_extract_fps, fmt=settings.frame_format
        )
        frames: list[ExtractedFrame] = extraction.frames
        logger.info("ingest[%s] extracted %d frames in %.1fs", video_id, len(frames), time.perf_counter() - t0)

        video_repo.update_video(
            video_id, progress=40, stage="Transcribing audio",
            frame_count=len(frames), duration=extraction.duration,
        )
        t0 = time.perf_counter()
        try:
            segments = transcribe(local_video, model_size=settings.whisper_model)
        except Exception as exc:  # audio may be absent or whisper unavailable
            segments = []
            logger.warning("ingest[%s] transcription skipped: %s", video_id, exc)
        logger.info("ingest[%s] transcribed %d segments in %.1fs", video_id, len(segments), time.perf_counter() - t0)

        video_repo.update_video(video_id, progress=60, stage="Uploading frames")
        # Upload frames to S3; metadata carries the S3 key (not a local path).
        frame_keys: list[str] = []
        for fr in frames:
            key = storage.frame_key(owner_id, video_id, fr.path.name)
            storage.upload_file(fr.path, key, content_type="image/jpeg")
            frame_keys.append(key)

        video_repo.update_video(video_id, progress=75, stage="Indexing in vector store")
        vector_store.reset_video(video_id)

        ids: list[str] = []
        texts: list[str] = []
        metadatas: list[dict] = []

        chunks = chunk_segments(
            segments,
            max_chars=settings.transcript_chunk_max_chars,
            max_gap_s=settings.transcript_chunk_max_gap_s,
        )
        for i, ch in enumerate(chunks):
            ids.append(f"t-{i}")
            texts.append(ch.text)
            metadatas.append({"type": "transcript", "timestamp": ch.start, "end": ch.end, "frame_path": ""})

        frame_window = (1.0 / settings.frame_extract_fps) if settings.frame_extract_fps else 1.0
        for i, fr in enumerate(frames):
            caption = _overlapping_text(fr.timestamp, fr.timestamp + frame_window, segments)
            if not caption and settings.enable_visual_captions:
                try:
                    caption = caption_frame(fr.path.read_bytes())
                except Exception as exc:  # noqa: BLE001 — never fail ingest on a caption
                    logger.warning("ingest[%s] frame caption error at %.1fs: %s", video_id, fr.timestamp, exc)
                    caption = ""
            if not caption:
                caption = f"Video keyframe at {fr.timestamp:.1f} seconds."
            ids.append(f"f-{i}")
            texts.append(caption)
            metadatas.append({
                "type": "frame", "timestamp": fr.timestamp, "end": fr.timestamp,
                "frame_path": frame_keys[i],
            })

        chunk_count = vector_store.index_items(video_id, ids, texts, metadatas)

    video_repo.update_video(
        video_id, status="ready", progress=100, stage="Ready",
        frame_count=len(frames), chunk_count=chunk_count, duration=extraction.duration, error=None,
    )
    return {"video_id": video_id, "frame_count": len(frames), "chunk_count": chunk_count}


def ingest_safe(video_id: str, owner_id: str, video_key: str, filename: str) -> None:
    """Background-task wrapper: never raises; records failures on the video row.

    Bounds concurrency via a module-level semaphore (fails fast if no slot frees
    within the queue-wait cap), retries transient errors, and enforces a hard
    per-job timeout: caps how long the caller waits before marking the job failed
    (the underlying worker thread may continue running until it returns).
    """
    settings = get_settings()
    if not _ingest_semaphore.acquire(timeout=settings.ingest_queue_timeout_s):
        logger.error("ingest[%s] timed out waiting for a slot", video_id)
        video_repo.update_video(
            video_id, status="failed", stage="Failed",
            error="Server busy: timed out waiting for an ingest slot. Please retry.",
        )
        return

    started = time.perf_counter()
    logger.info("ingest[%s] starting (acquired slot)", video_id)
    try:
        attempts = max(1, settings.ingest_max_retries)
        for attempt in range(1, attempts + 1):
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
                    future = ex.submit(run_ingest, video_id, owner_id, video_key, filename)
                    future.result(timeout=settings.ingest_job_timeout_s)
                logger.info("ingest[%s] ready in %.1fs", video_id, time.perf_counter() - started)
                return
            except concurrent.futures.TimeoutError:
                logger.error("ingest[%s] exceeded %ds timeout", video_id, settings.ingest_job_timeout_s)
                video_repo.update_video(
                    video_id, status="failed", stage="Failed",
                    error=f"Ingest exceeded the {settings.ingest_job_timeout_s}s time limit.",
                )
                return
            except _TRANSIENT as exc:
                if attempt < attempts:
                    backoff = 2 ** attempt
                    logger.warning("ingest[%s] transient error (attempt %d/%d): %s; retrying in %ds",
                                   video_id, attempt, attempts, exc, backoff)
                    time.sleep(backoff)
                    continue
                logger.exception("ingest[%s] failed after %d attempts: %s", video_id, attempts, exc)
                video_repo.update_video(video_id, status="failed", stage="Failed", error=str(exc))
                return
            except Exception as exc:  # permanent failure — don't retry
                logger.exception("ingest[%s] failed: %s", video_id, exc)
                video_repo.update_video(video_id, status="failed", stage="Failed", error=str(exc))
                return
    finally:
        _ingest_semaphore.release()
