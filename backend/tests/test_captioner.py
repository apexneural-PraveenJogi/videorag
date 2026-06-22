import app.services.captioner as captioner


class _FakeResp:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("http error")

    def json(self):
        return self._payload


def test_caption_returns_text(monkeypatch):
    payload = {"choices": [{"message": {"content": "A person waving at the camera."}}]}
    monkeypatch.setattr(captioner.httpx, "post", lambda *a, **k: _FakeResp(payload))
    monkeypatch.setattr(captioner, "get_settings", lambda: _settings())
    out = captioner.caption_frame(b"\xff\xd8\xff", model="x")
    assert out == "A person waving at the camera."


def test_caption_returns_empty_on_error(monkeypatch):
    def _boom(*a, **k):
        raise RuntimeError("network down")
    monkeypatch.setattr(captioner.httpx, "post", _boom)
    monkeypatch.setattr(captioner, "get_settings", lambda: _settings())
    assert captioner.caption_frame(b"\xff\xd8\xff", model="x") == ""


def _settings():
    from app.config import Settings
    return Settings(_env_file=None, openrouter_api_key="k")
