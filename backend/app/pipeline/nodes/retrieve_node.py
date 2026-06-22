"""Retrieve: embed the question and pull top-K items from ChromaDB.

Combines two pulls: score-filtered transcript+frame matches (precision), plus a
guaranteed spread of top keyframes (so the vision model can answer visual
"find/show me the moment where…" questions even on near-silent videos).
"""
from __future__ import annotations

from app.config import get_settings
from app.pipeline.state import RAGState
from app.services import vector_store


def retrieve_node(state: RAGState) -> RAGState:
    settings = get_settings()
    items = vector_store.query(
        video_id=state["video_id"],
        question=state["question"],
        top_k=state.get("top_k", 5),
        min_score=state.get("min_score"),
    )
    # Always give the model a spread of keyframes to look at, beyond whatever
    # passed the score floor above. Merge by id so frames aren't duplicated.
    seen = {i.id for i in items}
    for fr in vector_store.query_frames(
        state["video_id"], state["question"], k=settings.frame_top_k
    ):
        if fr.id not in seen:
            items.append(fr)
            seen.add(fr.id)
    return {"retrieved": items}
