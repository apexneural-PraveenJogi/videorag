"""Keyframe extraction using OpenCV (FFmpeg backend)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2

from app.utils.timestamp_utils import frame_filename


@dataclass
class ExtractedFrame:
    timestamp: float
    path: Path


@dataclass
class ExtractionResult:
    frames: list[ExtractedFrame]
    duration: float
    fps: float


def extract_keyframes(
    video_path: str | Path,
    out_dir: str | Path,
    target_fps: float = 1.0,
    fmt: str = "jpg",
) -> ExtractionResult:
    """Extract one keyframe every ``1/target_fps`` seconds.

    Uses OpenCV (which delegates to the FFmpeg libs) to decode. Frames are written
    as ``frame_<sec>.<fmt>`` into ``out_dir``.
    """
    video_path = Path(video_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = (total_frames / src_fps) if src_fps > 0 else 0.0

    if target_fps <= 0:
        target_fps = 1.0
    interval = 1.0 / target_fps

    frames: list[ExtractedFrame] = []
    next_capture = 0.0
    idx = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            # Prefer the decoder's reported position; fall back to frame index math.
            pos_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            ts = (pos_ms / 1000.0) if pos_ms and pos_ms > 0 else (idx / src_fps if src_fps else 0.0)
            if ts + 1e-6 >= next_capture:
                fname = frame_filename(ts, fmt)
                fpath = out_dir / fname
                params = []
                if fmt in ("jpg", "jpeg"):
                    params = [cv2.IMWRITE_JPEG_QUALITY, 85]
                cv2.imwrite(str(fpath), frame, params)
                frames.append(ExtractedFrame(timestamp=round(ts, 3), path=fpath))
                next_capture += interval
            idx += 1
    finally:
        cap.release()

    if duration <= 0 and frames:
        duration = frames[-1].timestamp
    return ExtractionResult(frames=frames, duration=round(duration, 3), fps=src_fps)
