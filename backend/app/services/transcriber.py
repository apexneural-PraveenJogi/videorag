"""Audio transcription using faster-whisper -> timestamped segments."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str


@lru_cache(maxsize=2)
def _load_model(model_size: str):
    # Imported lazily so the module imports even before the (heavy) dep is installed.
    from faster_whisper import WhisperModel

    # int8 keeps CPU memory/latency low; works without a GPU.
    return WhisperModel(model_size, device="cpu", compute_type="int8")


def transcribe(video_path: str | Path, model_size: str = "base") -> list[TranscriptSegment]:
    """Transcribe the audio track of ``video_path`` into timestamped segments.

    faster-whisper reads audio directly from the container via FFmpeg, so no
    separate audio extraction step is needed.
    """
    model = _load_model(model_size)
    segments, _info = model.transcribe(str(video_path), vad_filter=True)
    out: list[TranscriptSegment] = []
    for seg in segments:
        text = (seg.text or "").strip()
        if text:
            out.append(TranscriptSegment(start=round(seg.start, 3), end=round(seg.end, 3), text=text))
    return out
