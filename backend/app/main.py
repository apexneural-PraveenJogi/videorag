"""FastAPI application entry point for Video RAG."""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import auth as auth_api
from app.api import query as query_api
from app.api import video as video_api
from app.config import get_settings
from app.dependencies import limiter
from app.services import storage

# Public marketing asset: the looping clip shown in the landing hero, served
# from S3 like every other video (key is uploaded once, out of band).
HERO_VIDEO_KEY = "public/hero/live.mp4"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title=settings.app_title, version="1.0.0")

# Rate limiting (slowapi): the limiter must live on app.state and its 429s are
# rendered by the registered exception handler.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    # Allow all origins. allow_credentials=True means we can't return a literal
    # "*" (browsers reject that on credentialed requests), so we use a catch-all
    # regex — Starlette then echoes back each request's Origin (e.g.
    # https://videorag.apexneural.cloud), which is what browsers require.
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log method, path, status and duration for each request."""
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "%s %s -> %d (%dms)",
        request.method, request.url.path, response.status_code, duration_ms,
    )
    return response

app.include_router(auth_api.router, prefix=settings.api_prefix)
app.include_router(video_api.router, prefix=settings.api_prefix)
app.include_router(query_api.router, prefix=settings.api_prefix)


@app.on_event("startup")
def _startup() -> None:
    """Validate config, then create DB tables / chat-history table."""
    from app.config_validation import validate_production_config
    validate_production_config(settings)  # raises in prod on unsafe config

    if not settings.db_configured:
        logger.warning("DATABASE_URL not set — auth/persistence disabled until configured.")
        return
    try:
        from app.db import init_db
        from app.services import chat_memory

        init_db()
        chat_memory.init_tables()
        logger.info("database ready (tables ensured)")
    except Exception as exc:  # noqa: BLE001 — don't crash boot on a transient DB issue
        logger.error("database init failed: %s", exc)
    if not settings.s3_configured:
        logger.warning("AWS S3 not configured — uploads will fail until set.")


@app.get(f"{settings.api_prefix}/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "default_vision_model": settings.default_vision_model,
        "openrouter_configured": bool(settings.openrouter_api_key),
        "whisper_model": settings.whisper_model,
        "ingest_concurrency": settings.ingest_concurrency,
        "db_configured": settings.db_configured,
        "s3_configured": settings.s3_configured,
    }


@app.get(f"{settings.api_prefix}/models", tags=["models"])
async def models() -> dict:
    """Vision models offered to the client. The default is listed first."""
    return {
        "default": settings.default_vision_model,
        "models": settings.vision_models,
    }


@app.get(f"{settings.api_prefix}/hero-video", tags=["public"])
async def hero_video() -> dict:
    """Presigned URL for the landing-page hero clip in S3 (public, unauthed).

    Returns ``{"url": null}`` when S3 isn't configured so the client can fall
    back to the bundled asset.
    """
    if not settings.s3_configured:
        return {"url": None}
    try:
        return {"url": storage.presigned_url(HERO_VIDEO_KEY)}
    except Exception:  # noqa: BLE001 — never let the marketing page 500
        logger.exception("hero-video presign failed")
        return {"url": None}
