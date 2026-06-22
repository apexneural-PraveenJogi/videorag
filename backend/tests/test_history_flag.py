from app.models.query import QueryResponse


def test_query_response_has_history_flag():
    r = QueryResponse(answer="a", references=[], model_used="m", latency_ms=1, history_enabled=False)
    assert r.history_enabled is False


def test_history_enabled_defaults_true():
    r = QueryResponse(answer="a", references=[], model_used="m", latency_ms=1)
    assert r.history_enabled is True
