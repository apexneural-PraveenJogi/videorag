"""Text embeddings via an OpenAI-compatible /embeddings endpoint.

Per project decision the OpenRouter API key is reused here. The base URL is
independently configurable (``EMBEDDING_BASE_URL``) because OpenRouter may not
expose an embeddings route — point it at OpenAI or any compatible host as needed.
"""
from __future__ import annotations

import httpx

from app.config import get_settings


class EmbeddingError(RuntimeError):
    pass


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Returns one vector per input text."""
    if not texts:
        return []
    settings = get_settings()
    key = settings.effective_embedding_key
    if not key:
        raise EmbeddingError("No embedding API key configured (OPENROUTER_API_KEY / EMBEDDING_API_KEY).")

    url = settings.embedding_base_url.rstrip("/") + "/embeddings"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {"model": settings.embedding_model, "input": texts}

    try:
        resp = httpx.post(url, headers=headers, json=payload, timeout=60.0)
        resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise EmbeddingError(
            f"Embedding request failed ({exc.response.status_code}) at {url}. "
            f"If using OpenRouter, set EMBEDDING_BASE_URL to a host that serves /embeddings. "
            f"Body: {exc.response.text[:300]}"
        ) from exc
    except httpx.HTTPError as exc:
        raise EmbeddingError(f"Embedding request error: {exc}") from exc

    data = resp.json().get("data", [])
    # Preserve input order (OpenAI returns an ``index`` field).
    data_sorted = sorted(data, key=lambda d: d.get("index", 0))
    return [d["embedding"] for d in data_sorted]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
