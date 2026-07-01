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


class IngestCancelled(Exception):
    """Raised when the video row is deleted mid-ingest. Deleting the row is the
    cancel signal; on this we stop all remaining work and clean up, without
    marking the (now-gone) video as failed."""


def _abort_if_deleted(video_id: str, stop: threading.Event) -> None:
    """Cooperative cancellation checkpoint. Raises IngestCancelled if the video
    was deleted, and latches ``stop`` so in-flight worker threads bail early."""
    if stop.is_set() or not video_repo.exists(video_id):
        stop.set()
        raise IngestCancelled(video_id)


def _overlapping_text(ts: float, te: float, segments: list[TranscriptSegment]) -> str:
    parts = [s.text for s in segments if s.start <= te and s.end >= ts]
    return " ".join(parts).strip()


def run_ingest(video_id: str, owner_id: str, video_key: str, filename: str) -> dict:
    settings = get_settings()
    # Latched by _abort_if_deleted so in-flight upload/caption workers bail early.
    stop = threading.Event()

    with tempfile.TemporaryDirectory(prefix=f"ingest_{video_id}_") as tmp:
        tmp_dir = Path(tmp)
        local_video = tmp_dir / filename
        frames_out = tmp_dir / "frames"

        _abort_if_deleted(video_id, stop)
        video_repo.update_video(video_id, status="processing", progress=5, stage="Downloading")
        storage.download_to_file(video_key, local_video)

        _abort_if_deleted(video_id, stop)
        video_repo.update_video(video_id, progress=15, stage="Extracting keyframes")
        t0 = time.perf_counter()
        extraction = extract_keyframes(
            local_video, frames_out, target_fps=settings.frame_extract_fps, fmt=settings.frame_format
        )
        frames: list[ExtractedFrame] = extraction.frames
        logger.info("ingest[%s] extracted %d frames in %.1fs", video_id, len(frames), time.perf_counter() - t0)

        _abort_if_deleted(video_id, stop)
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

        n = len(frames)
        workers = max(1, min(settings.ingest_parallelism, n or 1))

        # Upload frames to S3 in parallel (progress 60 -> 73). Hundreds of small
        # PUTs are slow serially; fan them out and report as they land.
        _abort_if_deleted(video_id, stop)
        video_repo.update_video(video_id, progress=60, stage=f"Uploading frames (0/{n})")
        frame_keys: list[str | None] = [None] * n

        def _upload(idx: int) -> None:
            if stop.is_set():
                return
            fr = frames[idx]
            key = storage.frame_key(owner_id, video_id, fr.path.name)
            storage.upload_file(fr.path, key, content_type="image/jpeg")
            frame_keys[idx] = key

        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            futs = [ex.submit(_upload, i) for i in range(n)]
            for _ in concurrent.futures.as_completed(futs):
                done += 1
                if done % 10 == 0 or done == n:
                    _abort_if_deleted(video_id, stop)
                    video_repo.update_video(
                        video_id, progress=60 + int(13 * done / max(1, n)),
                        stage=f"Uploading frames ({done}/{n})",
                    )

        _abort_if_deleted(video_id, stop)
        video_repo.update_video(video_id, progress=74, stage="Indexing in vector store")
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

        # Caption frames in parallel (progress 75 -> 90). The vision call per
        # transcript-less frame is the real bottleneck on long/silent videos.
        frame_window = (1.0 / settings.frame_extract_fps) if settings.frame_extract_fps else 1.0
        captions: list[str] = [""] * n

        def _caption(idx: int) -> None:
            if stop.is_set():
                return
            fr = frames[idx]
            cap = _overlapping_text(fr.timestamp, fr.timestamp + frame_window, segments)
            if not cap and settings.enable_visual_captions:
                try:
                    cap = caption_frame(fr.path.read_bytes())
                except Exception as exc:  # noqa: BLE001 — never fail ingest on a caption
                    logger.warning("ingest[%s] frame caption error at %.1fs: %s", video_id, fr.timestamp, exc)
                    cap = ""
            captions[idx] = cap or f"Video keyframe at {fr.timestamp:.1f} seconds."

        done = 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            futs = [ex.submit(_caption, i) for i in range(n)]
            for _ in concurrent.futures.as_completed(futs):
                done += 1
                if done % 5 == 0 or done == n:
                    _abort_if_deleted(video_id, stop)
                    video_repo.update_video(
                        video_id, progress=75 + int(15 * done / max(1, n)),
                        stage=f"Captioning frames ({done}/{n})",
                    )

        for i, fr in enumerate(frames):
            ids.append(f"f-{i}")
            texts.append(captions[i])
            metadatas.append({
                "type": "frame", "timestamp": fr.timestamp, "end": fr.timestamp,
                "frame_path": frame_keys[i],
            })

        _abort_if_deleted(video_id, stop)
        video_repo.update_video(video_id, progress=92, stage="Embedding & indexing")
        chunk_count = vector_store.index_items(video_id, ids, texts, metadatas)

        # A delete that landed during indexing already ran vector_store.reset_video
        # before our write, leaving the freshly-written vectors orphaned. Detect
        # that here and clean them up.
        if not video_repo.exists(video_id):
            stop.set()
            vector_store.reset_video(video_id)
            raise IngestCancelled(video_id)
        video_repo.update_video(video_id, progress=98, stage="Finalizing")

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
            except IngestCancelled:
                logger.info("ingest[%s] cancelled — video deleted; stopped remaining work", video_id)
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
