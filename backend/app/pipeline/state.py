"""Shared state for the LangGraph RAG pipeline."""
from __future__ import annotations

from typing import TypedDict

from app.services.vector_store import RetrievedItem


class Reference(TypedDict):
    timestamp: float
    frame_path: str


class RAGState(TypedDict, total=False):
    # inputs
    video_id: str
    question: str
    model: str
    top_k: int
    # retrieve_node
    retrieved: list[RetrievedItem]
    # prompt_node
    messages: list[dict]
    references: list[Reference]
    # generate_node
    answer: str
