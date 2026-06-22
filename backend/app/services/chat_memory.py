"""Conversational memory via LangChain's PostgresChatMessageHistory.

Each (user, video) pair gets its own thread, keyed by a deterministic UUID.
All operations are best-effort: if the store is unavailable, memory is skipped
rather than breaking the answer.
"""
from __future__ import annotations

import logging
import uuid

import psycopg
from langchain_core.messages import AIMessage, HumanMessage
from langchain_postgres import PostgresChatMessageHistory

from app.config import get_settings

logger = logging.getLogger(__name__)

TABLE = "chat_history"


def session_id(user_id: str, video_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{user_id}:{video_id}"))


def _connect():
    return psycopg.connect(get_settings().psycopg_conninfo)


def init_tables() -> None:
    """Create the chat-history table. Called at startup when the DB is configured."""
    with _connect() as conn:
        PostgresChatMessageHistory.create_tables(conn, TABLE)


def load_recent(session: str, limit: int = 6) -> list[dict]:
    """Return the last `limit` messages as [{role, content}] (oldest first)."""
    try:
        with _connect() as conn:
            history = PostgresChatMessageHistory(TABLE, session, sync_connection=conn)
            msgs = history.messages[-limit:]
            return [
                {"role": "user" if m.type == "human" else "assistant", "content": m.content}
                for m in msgs
            ]
    except Exception as exc:  # noqa: BLE001 — memory is best-effort
        logger.warning("chat memory load failed: %s", exc)
        return []


def save_turn(session: str, question: str, answer: str) -> None:
    try:
        with _connect() as conn:
            history = PostgresChatMessageHistory(TABLE, session, sync_connection=conn)
            history.add_messages([HumanMessage(content=question), AIMessage(content=answer)])
    except Exception as exc:  # noqa: BLE001
        logger.warning("chat memory save failed: %s", exc)
