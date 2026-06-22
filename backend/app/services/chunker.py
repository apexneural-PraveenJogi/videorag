"""Merge Whisper segments into coherent retrieval chunks.

A new chunk starts when adding the next segment would exceed `max_chars`, or when
the silence gap before it exceeds `max_gap_s`. Chunk timestamps span the merged
segments; `start` is used as the retrieval timestamp downstream.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.services.transcriber import TranscriptSegment


@dataclass
class TranscriptChunk:
    start: float
    end: float
    text: str


def chunk_segments(
    segments: list[TranscriptSegment],
    max_chars: int = 320,
    max_gap_s: float = 1.5,
) -> list[TranscriptChunk]:
    chunks: list[TranscriptChunk] = []
    cur: TranscriptChunk | None = None
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        if cur is None:
            cur = TranscriptChunk(start=seg.start, end=seg.end, text=text)
            continue
        gap = seg.start - cur.end
        would_exceed = len(cur.text) + 1 + len(text) > max_chars
        if gap > max_gap_s or would_exceed:
            chunks.append(cur)
            cur = TranscriptChunk(start=seg.start, end=seg.end, text=text)
        else:
            cur.text = f"{cur.text} {text}"
            cur.end = seg.end
    if cur is not None:
        chunks.append(cur)
    return chunks
