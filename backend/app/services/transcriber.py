"""Audio transcription -> timestamped segments.

Default backend is OpenRouter speech-to-text (Groq-served Whisper large v3
turbo), which offloads transcription off the local CPU. The OpenRouter STT
endpoint returns text only (no per-word timestamps) and has a ~60s upstream
timeout, so we extract the audio with ffmpeg, split it into fixed-length
windows, transcribe the windows in parallel, and stamp each window's text with
its ``[start, end)`` range. Timestamps are therefore per-window (see
``stt_chunk_seconds``), which is plenty for frame<->transcript overlap matching.

On ANY failure (ffmpeg missing, no audio track, HTTP/timeout error, empty
result) it falls back to the local faster-whisper model, so ingest keeps
working offline / without an OpenRouter key.
"""
from __future__ import annotations

import base64
import concurrent.futures
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Speech-friendly, tiny files: mono 16 kHz MP3 is what Whisper wants anyway.
_STT_FORMAT = "mp3"


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


def transcribe(video_path: str | Path, model_size: str = "base") -> list[TranscriptSegment]:
    """Transcribe the audio track of ``video_path`` into timestamped segments.

    Uses the OpenRouter STT backend by default and falls back to local
    faster-whisper on any error. ``model_size`` applies only to the local model.
    """
    settings = get_settings()
    video_path = Path(video_path)

    if settings.transcribe_backend.lower() == "openrouter":
        try:
            return _transcribe_openrouter(video_path, settings)
        except Exception as exc:  # noqa: BLE001 - any failure should fall back to local
            logger.warning(
                "transcribe: OpenRouter STT failed (%s); falling back to local whisper.", exc
            )
    return _transcribe_local(video_path, model_size)


# --- OpenRouter backend --------------------------------------------------


def _transcribe_openrouter(video_path: Path, settings: Settings) -> list[TranscriptSegment]:
    key = settings.openrouter_api_key
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    chunk_s = max(1, int(settings.stt_chunk_seconds))
    with tempfile.TemporaryDirectory(prefix="stt-") as tmp:
        tmp_dir = Path(tmp)
        pattern = str(tmp_dir / f"chunk_%05d.{_STT_FORMAT}")
        # Extract mono 16 kHz audio and split into fixed windows in one pass.
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
            "-i", str(video_path),
            "-vn", "-ac", "1", "-ar", "16000",
            "-f", "segment", "-segment_time", str(chunk_s),
            "-c:a", "libmp3lame", "-q:a", "9",
            pattern,
        ]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0:
            raise RuntimeError(
                f"ffmpeg audio extraction failed: {proc.stderr.decode('utf-8', 'replace')[:300]}"
            )

        chunks = sorted(tmp_dir.glob(f"chunk_*.{_STT_FORMAT}"))
        if not chunks:
            raise RuntimeError("ffmpeg produced no audio chunks (no audio track?)")

        # Read bytes inside the tempdir; transcribe in parallel (I/O-bound).
        chunk_bytes = [c.read_bytes() for c in chunks]

    workers = max(1, int(settings.ingest_parallelism))
    texts: list[str] = [""] * len(chunk_bytes)

    def _do(idx: int) -> None:
        texts[idx] = _transcribe_chunk(chunk_bytes[idx], settings, key)

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(_do, range(len(chunk_bytes))))

    segments: list[TranscriptSegment] = []
    for i, raw in enumerate(texts):
        text = (raw or "").strip()
        if not text:
            continue
        start = float(i * chunk_s)
        segments.append(TranscriptSegment(start=start, end=start + float(chunk_s), text=text))
    return segments


def _transcribe_chunk(audio_bytes: bytes, settings: Settings, key: str) -> str:
    url = settings.openrouter_base_url.rstrip("/") + "/audio/transcriptions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload: dict = {
        "model": settings.stt_model,
        "input_audio": {
            "data": base64.b64encode(audio_bytes).decode("ascii"),
            "format": _STT_FORMAT,
        },
    }
    order = [p.strip() for p in settings.stt_provider_order.split(",") if p.strip()]
    if order:
        payload["provider"] = {"order": order, "allow_fallbacks": True}

    resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
    resp.raise_for_status()
    return resp.json().get("text", "") or ""


# --- Local faster-whisper fallback ---------------------------------------


@lru_cache(maxsize=2)
def _load_model(model_size: str):
    # Imported lazily so the module imports even before the (heavy) dep is installed.
    from faster_whisper import WhisperModel

    # int8 keeps CPU memory/latency low; works without a GPU.
    return WhisperModel(model_size, device="cpu", compute_type="int8")


def _transcribe_local(video_path: Path, model_size: str) -> list[TranscriptSegment]:
    """Transcribe locally with faster-whisper. Reads audio directly from the
    container via FFmpeg, so no separate extraction step is needed."""
    model = _load_model(model_size)
    segments, _info = model.transcribe(str(video_path), vad_filter=True)
    out: list[TranscriptSegment] = []
    for seg in segments:
        text = (seg.text or "").strip()
        if text:
            out.append(TranscriptSegment(start=round(seg.start, 3), end=round(seg.end, 3), text=text))
    return out
