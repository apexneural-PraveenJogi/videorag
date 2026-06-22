import httpx
import pytest

import app.pipeline.nodes.generate_node as gn


def _resp(payload, status=200):
    request = httpx.Request("POST", "http://x/chat/completions")
    return httpx.Response(status, json=payload, request=request)


def test_retries_once_then_succeeds(monkeypatch):
    calls = {"n": 0}
    ok = {"choices": [{"message": {"content": "hi"}}]}

    def fake_post(*a, **k):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("boom")
        return _resp(ok)

    monkeypatch.setattr(gn.httpx, "post", fake_post)
    monkeypatch.setattr(gn, "_headers", lambda: {})
    out = gn.generate_node({"messages": [], "model": "m"})
    assert out["answer"] == "hi"
    assert calls["n"] == 2


def test_raises_after_persistent_failure(monkeypatch):
    def fake_post(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(gn.httpx, "post", fake_post)
    monkeypatch.setattr(gn, "_headers", lambda: {})
    with pytest.raises(gn.GenerationError):
        gn.generate_node({"messages": [], "model": "m"})


def test_referer_uses_public_base_url(monkeypatch):
    from app.config import Settings
    monkeypatch.setattr(gn, "get_settings",
                        lambda: Settings(_env_file=None, openrouter_api_key="k",
                                         public_base_url="https://app.example.com"))
    assert gn._headers()["HTTP-Referer"] == "https://app.example.com"
