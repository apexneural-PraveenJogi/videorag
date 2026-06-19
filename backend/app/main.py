"""FastAPI application entry point for Video RAG."""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import query as query_api
from app.api import video as video_api
from app.config import get_settings
from app.dependencies import limiter

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
    allow_origins=settings.cors_origin_list,
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

# Serve extracted frames as static files (referenced by /frames/<id>/<name>).
app.mount("/frames", StaticFiles(directory=str(settings.frames_dir)), name="frames")

app.include_router(video_api.router, prefix=settings.api_prefix)
app.include_router(query_api.router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "default_vision_model": settings.default_vision_model,
        "openrouter_configured": bool(settings.openrouter_api_key),
        "whisper_model": settings.whisper_model,
        "ingest_concurrency": settings.ingest_concurrency,
    }


@app.get(f"{settings.api_prefix}/models", tags=["models"])
async def models() -> dict:
    """Vision models offered to the client. The default is listed first."""
    return {
        "default": settings.default_vision_model,
        "models": settings.vision_models,
    }
