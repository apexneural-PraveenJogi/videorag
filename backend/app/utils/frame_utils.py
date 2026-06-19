"""Frame encoding helpers."""
import base64
from pathlib import Path

_MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}


def encode_frame_data_url(frame_path: str | Path) -> str:
    """Read a frame file and return a base64 data URL for OpenRouter multimodal input."""
    path = Path(frame_path)
    ext = path.suffix.lstrip(".").lower()
    mime = _MIME.get(ext, "image/jpeg")
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"
