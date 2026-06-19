"""Pydantic schemas for video upload / status."""
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ProcessingStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class VideoUploadResponse(BaseModel):
    video_id: str
    filename: str
    status: ProcessingStatus
    message: str = "Upload received; processing started."


class VideoStatus(BaseModel):
    video_id: str
    filename: str
    status: ProcessingStatus
    progress: int = 0  # 0-100
    stage: str = ""  # human-readable current stage
    frame_count: int = 0
    chunk_count: int = 0
    duration: float = 0.0
    error: Optional[str] = None


class VideoListResponse(BaseModel):
    videos: list[VideoStatus]


class FrameInfo(BaseModel):
    timestamp: float
    frame_path: str  # URL path served by the API


class FrameListResponse(BaseModel):
    video_id: str
    frames: list[FrameInfo]
