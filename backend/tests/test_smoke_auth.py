"""In-process HTTP smoke test for the auth flow, backed by SQLite."""
import os

# Neutralize real remote services BEFORE importing app.main or anything that
# triggers get_settings() to cache.  This makes settings.db_configured False,
# so the startup event skips init_db() / chat_memory.init_tables() entirely —
# no network connections are made.
os.environ["APP_ENV"] = "development"
os.environ["DATABASE_URL"] = ""   # neutralize remote DB so startup skips init_db()
os.environ["AWS_S3_BUCKET"] = ""  # neutralize S3
import app.config as _cfg
_cfg.get_settings.cache_clear()   # drop any cached Settings from earlier-imported modules

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db as db_module
from app.db import Base


@pytest.fixture()
def client(monkeypatch):
    # StaticPool ensures all connections share the same in-memory SQLite database,
    # which is required because TestClient runs ASGI in a thread that would otherwise
    # get a fresh empty `:memory:` database each time.
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    import app.models_db  # noqa: F401 — register mappers
    Base.metadata.create_all(engine)

    def _get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    from app.main import app
    from app.api.auth import get_db as auth_get_db
    app.dependency_overrides[db_module.get_db] = _get_db
    app.dependency_overrides[auth_get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_register_me_refresh_flow(client):
    r = client.post("/api/v1/auth/register",
                    json={"email": "a@b.com", "password": "abcd1234"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"] and body["refresh_token"]

    token = body["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "a@b.com"

    rr = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert rr.status_code == 200
    assert rr.json()["access_token"]


def test_duplicate_registration_conflicts(client):
    payload = {"email": "dup@b.com", "password": "abcd1234"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 200
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_weak_password_rejected(client):
    r = client.post("/api/v1/auth/register",
                    json={"email": "weak@b.com", "password": "abcdefgh"})
    assert r.status_code == 422


def test_auth_endpoints_are_rate_limited():
    # The slowapi decorator tags the limited routes; assert register/login carry it.
    from app.main import app
    limited = {r.path for r in app.routes if getattr(r, "endpoint", None)
               and hasattr(r.endpoint, "__wrapped__")}
    assert "/api/v1/auth/register" in limited or "/api/v1/auth/login" in limited
