from app.services.chunker import TranscriptChunk, chunk_segments
from app.services.transcriber import TranscriptSegment


def _seg(s, e, t):
    return TranscriptSegment(start=s, end=e, text=t)


def test_empty():
    assert chunk_segments([]) == []


def test_merges_adjacent_short_segments():
    segs = [_seg(0.0, 1.0, "Hello"), _seg(1.2, 2.0, "world")]
    chunks = chunk_segments(segs, max_chars=320, max_gap_s=1.5)
    assert len(chunks) == 1
    assert chunks[0] == TranscriptChunk(start=0.0, end=2.0, text="Hello world")


def test_splits_on_large_gap():
    segs = [_seg(0.0, 1.0, "Part one"), _seg(10.0, 11.0, "Part two")]
    chunks = chunk_segments(segs, max_chars=320, max_gap_s=1.5)
    assert len(chunks) == 2
    assert chunks[0].text == "Part one"
    assert chunks[1].text == "Part two"


def test_splits_on_max_chars():
    segs = [_seg(i, i + 0.5, "x" * 100) for i in range(5)]  # gaps small
    chunks = chunk_segments(segs, max_chars=250, max_gap_s=5.0)
    assert len(chunks) >= 2
    assert all(len(c.text) <= 250 + 100 for c in chunks)
