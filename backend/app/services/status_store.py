"""On-disk per-video processing status (no DB needed for the MVP).

Each video gets ``storage/videos/<id>/status.json``. Reads/writes are small and
atomic (write-temp-then-replace) so a polling frontend always sees a consistent doc.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.models.video import ProcessingStatus, VideoStatus


def _status_path(video_id: str) -> Path:
    return get_settings().videos_dir / video_id / "status.json"


def write_status(status: VideoStatus) -> None:
    path = _status_path(status.video_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(status.model_dump_json(indent=2))
    os.replace(tmp, path)


def read_status(video_id: str) -> Optional[VideoStatus]:
    path = _status_path(video_id)
    if not path.exists():
        return None
    return VideoStatus.model_validate_json(path.read_text())


def update_status(video_id: str, **fields) -> VideoStatus:
    current = read_status(video_id)
    if current is None:
        current = VideoStatus(
            video_id=video_id, filename=fields.get("filename", ""), status=ProcessingStatus.queued
        )
    updated = current.model_copy(update=fields)
    write_status(updated)
    return updated
