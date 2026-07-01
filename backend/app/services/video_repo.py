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


def exists(video_id: str) -> bool:
    """Whether the video row still exists. Deleting the row is how a running
    ingest is told to cancel, so this is the ingest's cancellation check."""
    with session_scope() as db:
        return db.get(Video, video_id) is not None
