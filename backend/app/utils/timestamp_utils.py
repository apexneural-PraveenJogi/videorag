"""Timestamp formatting helpers."""


def format_timestamp(seconds: float) -> str:
    """3661 -> '1:01:01', 121 -> '2:01'."""
    total = int(round(seconds))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def frame_filename(seconds: float, ext: str = "jpg") -> str:
    """Stable, zero-padded frame filename from a timestamp in seconds."""
    return f"frame_{int(round(seconds)):06d}.{ext}"
