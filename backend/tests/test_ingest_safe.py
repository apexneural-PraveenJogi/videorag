import app.pipeline.nodes.ingest_node as ing


def test_retries_then_succeeds(monkeypatch):
    calls = {"n": 0}
    updates = []
    monkeypatch.setattr(ing.video_repo, "update_video", lambda vid, **f: updates.append(f))

    def flaky(video_id, owner_id, video_key, filename):
        calls["n"] += 1
        if calls["n"] < 2:
            raise ConnectionError("transient")
        return {"ok": True}

    monkeypatch.setattr(ing, "run_ingest", flaky)
    # Avoid real timeouts/threads being slow: keep timeout generous.
    monkeypatch.setattr(ing, "get_settings",
                        lambda: _settings(ingest_max_retries=2, ingest_job_timeout_s=30))
    ing.ingest_safe("v1", "o1", "k1", "f.mp4")
    assert calls["n"] == 2
    # No "failed" status recorded.
    assert not any(f.get("status") == "failed" for f in updates)


def test_marks_failed_on_persistent_error(monkeypatch):
    updates = []
    monkeypatch.setattr(ing.video_repo, "update_video", lambda vid, **f: updates.append(f))

    def always_fail(*a, **k):
        raise ValueError("bad video")

    monkeypatch.setattr(ing, "run_ingest", always_fail)
    monkeypatch.setattr(ing, "get_settings",
                        lambda: _settings(ingest_max_retries=2, ingest_job_timeout_s=30))
    ing.ingest_safe("v2", "o2", "k2", "f.mp4")
    assert any(f.get("status") == "failed" for f in updates)


def _settings(**overrides):
    from app.config import Settings
    base = dict(ingest_concurrency=2, ingest_queue_timeout_s=5)
    base.update(overrides)
    return Settings(_env_file=None, **base)
