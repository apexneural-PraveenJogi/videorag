"""Q&A routes: JSON (full pipeline) and SSE streaming."""
# No `from __future__ import annotations` — see the note in api/video.py: the
# slowapi @limiter.limit wrapper breaks FastAPI's resolution of string annotations.
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import Settings, get_settings
from app.dependencies import limiter, settings_dep
from app.models.query import QueryRequest, QueryResponse, Reference
from app.models.video import ProcessingStatus
from app.pipeline.graph import get_query_graph
from app.pipeline.nodes.generate_node import stream_answer
from app.pipeline.nodes.prompt_node import prompt_node
from app.pipeline.nodes.retrieve_node import retrieve_node
from app.services import status_store

router = APIRouter(tags=["query"])

_settings = get_settings()


def _ensure_ready(video_id: str) -> None:
    status = status_store.read_status(video_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    if status.status != ProcessingStatus.ready:
        raise HTTPException(
            status_code=409,
            detail=f"Video is not ready (status: {status.status.value}).",
        )


@router.post("/query", response_model=QueryResponse)
@limiter.limit(_settings.rate_limit_query)
async def query(
    request: Request, req: QueryRequest, settings: Settings = Depends(settings_dep)
) -> QueryResponse:
    _ensure_ready(req.video_id)
    model = req.model or settings.default_vision_model
    started = time.perf_counter()

    graph = get_query_graph()
    result = graph.invoke({
        "video_id": req.video_id,
        "question": req.question,
        "model": model,
        "top_k": req.top_k,
    })

    latency_ms = int((time.perf_counter() - started) * 1000)
    return QueryResponse(
        answer=result.get("answer", ""),
        references=[Reference(**r) for r in result.get("references", [])],
        model_used=model,
        latency_ms=latency_ms,
    )


@router.post("/query/stream")
@limiter.limit(_settings.rate_limit_query)
async def query_stream(
    request: Request, req: QueryRequest, settings: Settings = Depends(settings_dep)
):
    """Stream the answer as SSE. Emits a `references` event first, then `token`
    events, then a final `done` event."""
    _ensure_ready(req.video_id)
    model = req.model or settings.default_vision_model

    # Run retrieve + prompt synchronously to obtain messages + references.
    state = {"video_id": req.video_id, "question": req.question, "model": model, "top_k": req.top_k}
    state.update(retrieve_node(state))
    state.update(prompt_node(state))
    references = state.get("references", [])
    messages = state.get("messages", [])

    def event_stream():
        yield f"event: references\ndata: {json.dumps(references)}\n\n"
        try:
            for token in stream_answer(messages, model):
                yield f"event: token\ndata: {json.dumps(token)}\n\n"
        except Exception as exc:  # surface generation errors to the client
            yield f"event: error\ndata: {json.dumps(str(exc))}\n\n"
            return
        yield f"event: done\ndata: {json.dumps({'model_used': model})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
