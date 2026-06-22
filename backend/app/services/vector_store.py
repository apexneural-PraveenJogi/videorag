"""ChromaDB persistence: one collection per video, explicit embeddings.

Following the PRD's text-grounding approach, both transcript chunks and frames are
indexed as text + a precomputed embedding. Frames are described by the transcript
that overlaps their timestamp window so visual moments are retrievable by language.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import chromadb

from app.config import get_settings
from app.services.embedder import embed_texts, embed_query


@dataclass
class RetrievedItem:
    id: str
    type: str  # "frame" | "transcript"
    text: str
    timestamp: float
    end: float
    frame_path: str  # "" for transcript items
    distance: float
    score: float = 0.0  # cosine similarity = 1 - distance


def filter_by_score(items: list[RetrievedItem], min_score: float) -> list[RetrievedItem]:
    """Drop items below the similarity floor. If everything is below it, keep the
    single best item so the model still has something to work with."""
    if not items:
        return []
    kept = [i for i in items if i.score >= min_score]
    if kept:
        return kept
    return [max(items, key=lambda i: i.score)]


@lru_cache
def _client() -> chromadb.ClientAPI:
    settings = get_settings()
    return chromadb.PersistentClient(path=settings.chroma_persist_dir)


def _collection_name(video_id: str) -> str:
    return f"video_{video_id.replace('-', '')}"


def reset_video(video_id: str) -> None:
    """Drop any existing collection for this video (idempotent re-index)."""
    try:
        _client().delete_collection(_collection_name(video_id))
    except Exception:
        pass


def _collection(video_id: str):
    return _client().get_or_create_collection(
        name=_collection_name(video_id), metadata={"hnsw:space": "cosine"}
    )


def index_items(
    video_id: str,
    ids: list[str],
    texts: list[str],
    metadatas: list[dict],
) -> int:
    """Embed and upsert items for a video. Returns number of items written."""
    if not ids:
        return 0
    embeddings = embed_texts(texts)
    col = _collection(video_id)
    col.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    return len(ids)


def query(
    video_id: str,
    question: str,
    top_k: int = 5,
    min_score: float | None = None,
) -> list[RetrievedItem]:
    settings = get_settings()
    top_k = max(1, min(top_k, settings.top_k_max))
    if min_score is None:
        min_score = settings.retrieval_min_score

    col = _collection(video_id)
    if col.count() == 0:
        return []
    q_emb = embed_query(question)
    res = col.query(
        query_embeddings=[q_emb],
        n_results=min(top_k, col.count()),
        include=["documents", "metadatas", "distances"],
    )
    items: list[RetrievedItem] = []
    ids = res.get("ids", [[]])[0]
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]
    for i, _id in enumerate(ids):
        meta = metas[i] or {}
        distance = float(dists[i]) if dists else 0.0
        items.append(
            RetrievedItem(
                id=_id,
                type=meta.get("type", "transcript"),
                text=docs[i] or "",
                timestamp=float(meta.get("timestamp", 0.0)),
                end=float(meta.get("end", meta.get("timestamp", 0.0))),
                frame_path=meta.get("frame_path", "") or "",
                distance=distance,
                score=1.0 - distance,
            )
        )
    return filter_by_score(items, min_score)


def query_frames(video_id: str, question: str, k: int = 8) -> list[RetrievedItem]:
    """Return the top-`k` keyframes for the question, WITHOUT a score floor.

    Frames are how the model answers visual questions ("show the smiling frame"),
    so we always hand it a spread of candidates to look at rather than filtering
    down to the single best caption match.
    """
    col = _collection(video_id)
    count = col.count()
    if count == 0:
        return []
    q_emb = embed_query(question)
    res = col.query(
        query_embeddings=[q_emb],
        n_results=min(k, count),
        where={"type": "frame"},
        include=["documents", "metadatas", "distances"],
    )
    ids = res.get("ids", [[]])[0]
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]
    frames: list[RetrievedItem] = []
    for i, _id in enumerate(ids):
        meta = metas[i] or {}
        distance = float(dists[i]) if dists else 0.0
        frames.append(
            RetrievedItem(
                id=_id,
                type="frame",
                text=docs[i] or "",
                timestamp=float(meta.get("timestamp", 0.0)),
                end=float(meta.get("end", meta.get("timestamp", 0.0))),
                frame_path=meta.get("frame_path", "") or "",
                distance=distance,
                score=1.0 - distance,
            )
        )
    return frames
