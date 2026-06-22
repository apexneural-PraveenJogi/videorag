import app.pipeline.nodes.prompt_node as pn
from app.services.vector_store import RetrievedItem


def _frame(_id, ts):
    return RetrievedItem(id=_id, type="frame", text="", timestamp=ts, end=ts,
                         frame_path=f"key-{_id}", distance=0.1, score=0.9)


def test_references_sorted_by_timestamp(monkeypatch):
    # Stub S3 access so prompt_node runs without network.
    monkeypatch.setattr(pn, "_data_url_from_key", lambda key: "data:image/jpeg;base64,AAAA")
    monkeypatch.setattr(pn.storage, "presigned_url", lambda key: f"url://{key}")
    state = {"question": "q", "retrieved": [_frame("a", 9.0), _frame("b", 2.0), _frame("c", 5.0)]}
    out = pn.prompt_node(state)
    ts = [r["timestamp"] for r in out["references"]]
    assert ts == [2.0, 5.0, 9.0]
