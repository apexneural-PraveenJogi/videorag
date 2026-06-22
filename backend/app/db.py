"""SQLAlchemy engine/session wiring.

The engine is created lazily so the app can import and boot even before a
DATABASE_URL is configured (endpoints that need the DB return 503 until then).
"""
from contextlib import contextmanager
from typing import Iterator, Optional

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def _ensure_engine() -> Optional[Engine]:
    global _engine, _SessionLocal
    settings = get_settings()
    if not settings.database_url:
        return None
    if _engine is None:
        _engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def init_db() -> None:
    """Create tables. Called at startup when the DB is configured."""
    engine = _ensure_engine()
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    import app.models_db  # noqa: F401 — register mappers
    Base.metadata.create_all(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    """Standalone session (for background tasks). Commits on success."""
    if _ensure_engine() is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db() -> Iterator[Session]:
    """FastAPI request-scoped session dependency."""
    if _ensure_engine() is None:
        raise HTTPException(status_code=503, detail="Database is not configured.")
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
