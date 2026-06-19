"""Retrieve: embed the question and pull top-K items from ChromaDB."""
from __future__ import annotations

from app.pipeline.state import RAGState
from app.services import vector_store


def retrieve_node(state: RAGState) -> RAGState:
    items = vector_store.query(
        video_id=state["video_id"],
        question=state["question"],
        top_k=state.get("top_k", 5),
    )
    return {"retrieved": items}
