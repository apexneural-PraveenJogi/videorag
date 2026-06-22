"""Helpers to update Video rows from background tasks (own session)."""
from app.db import session_scope
from app.models_db import Video


def update_video(video_id: str, **fields) -> None:
    with session_scope() as db:
        video = db.get(Video, video_id)
        if video is None:
            return
        for key, value in fields.items():
            setattr(video, key, value)
