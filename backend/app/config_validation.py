"""Startup configuration guard. In production, refuse to boot on unsafe config."""
from __future__ import annotations

from app.config import Settings

_DEFAULT_SECRET = "change-me-in-production"


class ConfigError(RuntimeError):
    pass


def validate_production_config(settings: Settings) -> None:
    """Raise ConfigError if running in production with unsafe/missing config.

    No-op in development.
    """
    if not settings.is_production:
        return
    problems: list[str] = []
    if not settings.jwt_secret or settings.jwt_secret == _DEFAULT_SECRET:
        problems.append("JWT_SECRET must be set to a strong secret (openssl rand -hex 32).")
    if not settings.db_configured:
        problems.append("DATABASE_URL must be configured.")
    if not settings.s3_configured:
        problems.append("AWS S3 (bucket + access key + secret) must be configured.")
    if problems:
        raise ConfigError("Unsafe production config:\n - " + "\n - ".join(problems))
