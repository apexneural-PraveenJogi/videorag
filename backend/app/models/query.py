"""Pydantic schemas for the Q&A query endpoint."""
from typing import Optional

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    video_id: str
    question: str = Field(..., min_length=1)
    model: Optional[str] = None  # defaults to settings.default_vision_model
    top_k: int = Field(default=5, ge=1, le=20)


class Reference(BaseModel):
    timestamp: float
    frame_path: str


class QueryResponse(BaseModel):
    answer: str
    references: list[Reference]
    model_used: str
    latency_ms: int
