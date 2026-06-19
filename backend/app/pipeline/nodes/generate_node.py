"""Generate: call the OpenRouter vision model.

Provides both a blocking node (for the LangGraph pipeline / JSON endpoint) and a
streaming generator (for the SSE endpoint).
"""
from __future__ import annotations

import json
from typing import Iterator

import httpx

from app.config import get_settings
from app.pipeline.state import RAGState


class GenerationError(RuntimeError):
    pass


def _headers() -> dict:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise GenerationError("OPENROUTER_API_KEY is not configured.")
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        # Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Video RAG",
    }


def _chat_url() -> str:
    return get_settings().openrouter_base_url.rstrip("/") + "/chat/completions"


def generate_node(state: RAGState) -> RAGState:
    settings = get_settings()
    model = state.get("model") or settings.default_vision_model
    payload = {"model": model, "messages": state["messages"], "stream": False}
    try:
        resp = httpx.post(_chat_url(), headers=_headers(), json=payload, timeout=120.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise GenerationError(
            f"OpenRouter request failed ({exc.response.status_code}): {exc.response.text[:300]}"
        ) from exc
    except httpx.HTTPError as exc:
        raise GenerationError(f"OpenRouter request error: {exc}") from exc

    data = resp.json()
    answer = data["choices"][0]["message"]["content"]
    return {"answer": answer}


def stream_answer(messages: list[dict], model: str) -> Iterator[str]:
    """Yield answer token deltas from OpenRouter's SSE stream."""
    payload = {"model": model, "messages": messages, "stream": True}
    with httpx.stream("POST", _chat_url(), headers=_headers(), json=payload, timeout=120.0) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if not line or not line.startswith("data:"):
                continue
            data = line[len("data:"):].strip()
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                delta = chunk["choices"][0]["delta"].get("content")
                if delta:
                    yield delta
            except (json.JSONDecodeError, KeyError, IndexError):
                continue
