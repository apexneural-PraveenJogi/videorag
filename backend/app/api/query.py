"""Q&A routes: JSON (full pipeline) and SSE streaming, per user, with memory."""
# No `from __future__ import annotations` — see api/video.py (slowapi wrapper).
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.config import Settings, get_settings
from app.db import get_db
from app.dependencies import limiter, settings_dep
from app.models.query import QueryRequest, QueryResponse, Reference
from app.models_db import User, Video
from app.pipeline.graph import get_query_graph
from app.pipeline.nodes.generate_node import stream_answer
from app.pipeline.nodes.prompt_node import prompt_node
from app.pipeline.nodes.retrieve_node import retrieve_node
from app.services import chat_memory

router = APIRouter(tags=["query"])

_settings = get_settings()


def _ensure_ready(db: Session, video_id: str, user: User) -> Video:
    video = db.get(Video, video_id)
    if video is None or video.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Video not found.")
    if video.status != "ready":
        raise HTTPException(status_code=409, detail=f"Video is not ready (status: {video.status}).")
    return video


@router.post("/query", response_model=QueryResponse)
@limiter.limit(_settings.rate_limit_query)
def query(
    request: Request,
    req: QueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
) -> QueryResponse:
    _ensure_ready(db, req.video_id, user)
    # Locked to the single configured vision model (Gemini 3.5 Flash). Any model
    # the client tries to supply is ignored — model choice is not user-selectable.
    model = settings.default_vision_model
    session = chat_memory.session_id(user.id, req.video_id)
    started = time.perf_counter()

    result = get_query_graph().invoke({
        "video_id": req.video_id,
        "question": req.question,
        "model": model,
        "top_k": req.top_k,
        "history": chat_memory.load_recent(session),
    })

    answer = result.get("answer", "")
    chat_memory.save_turn(session, req.question, answer)
    return QueryResponse(
        answer=answer,
        references=[Reference(**r) for r in result.get("references", [])],
        model_used=model,
        latency_ms=int((time.perf_counter() - started) * 1000),
        history_enabled=chat_memory.is_enabled(),
    )


@router.post("/query/stream")
@limiter.limit(_settings.rate_limit_query)
def query_stream(
    request: Request,
    req: QueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(settings_dep),
):
    """Stream the answer as SSE: a `references` event, then `token` events, then `done`."""
    _ensure_ready(db, req.video_id, user)
    # Locked to the single configured vision model (Gemini 3.5 Flash) — see /query.
    model = settings.default_vision_model
    session = chat_memory.session_id(user.id, req.video_id)

    state = {
        "video_id": req.video_id,
        "question": req.question,
        "model": model,
        "top_k": req.top_k,
        "history": chat_memory.load_recent(session),
    }
    state.update(retrieve_node(state))
    state.update(prompt_node(state))
    references = state.get("references", [])
    messages = state.get("messages", [])

    def event_stream():
        yield f"event: references\ndata: {json.dumps(references)}\n\n"
        parts: list[str] = []
        try:
            for token in stream_answer(messages, model):
                parts.append(token)
                yield f"event: token\ndata: {json.dumps(token)}\n\n"
        except Exception as exc:  # surface generation errors to the client
            yield f"event: error\ndata: {json.dumps(str(exc))}\n\n"
            return
        chat_memory.save_turn(session, req.question, "".join(parts))
        yield f"event: done\ndata: {json.dumps({'model_used': model, 'history_enabled': chat_memory.is_enabled()})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
