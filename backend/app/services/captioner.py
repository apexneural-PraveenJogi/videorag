"""Generate a short visual caption for a keyframe via the OpenRouter vision model.

Used only for frames whose timestamp window has no transcript text, so silent
scenes remain retrievable by language. Best-effort: returns "" on any failure.
"""
from __future__ import annotations

import base64
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_PROMPT = (
    "Describe this single video frame in one concise sentence for search indexing. "
    "Name visible objects, people, actions, text, and setting. No preamble."
)


def caption_frame(image_bytes: bytes, mime: str = "image/jpeg", model: str | None = None) -> str:
    settings = get_settings()
    if not settings.openrouter_api_key:
        return ""
    model = model or settings.visual_caption_model or settings.default_vision_model
    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    url = settings.openrouter_base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.public_base_url,
        "X-Title": "Video RAG",
    }
    payload = {
        "model": model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": _PROMPT},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }],
        "max_tokens": 80,
    }
    try:
        resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"].get("content")
        return (content or "").strip()
    except Exception as exc:  # noqa: BLE001 — best-effort
        logger.warning("frame caption failed: %s", exc)
        return ""
