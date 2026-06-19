"""Shared FastAPI dependencies."""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import Settings, get_settings

# Shared rate limiter, keyed by client IP. Imported by the route modules (for the
# @limiter.limit decorators) and by app.main (to wire up state + middleware).
limiter = Limiter(key_func=get_remote_address)

ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-matroska": ".mkv",
    "video/x-msvideo": ".avi",
}


def settings_dep() -> Settings:
    return get_settings()
