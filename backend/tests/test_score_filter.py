from app.services.vector_store import RetrievedItem, filter_by_score


def _item(_id, distance):
    return RetrievedItem(
        id=_id, type="transcript", text="t", timestamp=0.0, end=0.0,
        frame_path="", distance=distance, score=1.0 - distance,
    )


def test_keeps_only_above_floor():
    items = [_item("a", 0.1), _item("b", 0.5), _item("c", 0.9)]  # scores .9 .5 .1
    kept = filter_by_score(items, min_score=0.4)
    assert [i.id for i in kept] == ["a", "b"]


def test_keeps_best_when_all_below_floor():
    items = [_item("a", 0.95), _item("b", 0.99)]  # scores .05 .01
    kept = filter_by_score(items, min_score=0.4)
    assert [i.id for i in kept] == ["a"]  # single best by score


def test_empty():
    assert filter_by_score([], min_score=0.4) == []
