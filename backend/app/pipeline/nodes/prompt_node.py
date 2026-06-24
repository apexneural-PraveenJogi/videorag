"""Prompt: build the OpenRouter multimodal messages array + references.

Frames live in S3; their bytes are pulled for the model and a presigned URL is
returned to the client. Prior conversation turns (state['history']) are inserted
as real chat messages so follow-up questions have context.
"""
from __future__ import annotations

import base64
import logging

from app.pipeline.state import RAGState, Reference
from app.services import storage
from app.services.vector_store import RetrievedItem
from app.utils.timestamp_utils import format_timestamp

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are VideoRAG, an expert video-analysis assistant. For each question you "
    "are given a set of keyframes extracted from one video — each labelled with its "
    "timecode — together with any available transcript excerpts. Answer the user's "
    "question about that video accurately, helpfully, and concisely.\n\n"
    "GROUNDING RULES:\n"
    "- Base every statement only on what is actually visible in the keyframes or "
    "present in the transcript. Never invent details, names, numbers, prices, or "
    "events that you cannot directly see or read.\n"
    "- Cite the timecode for every visual claim, written exactly as 'at M:SS' (for "
    "example 'at 0:42'). The interface turns these into clickable links, so the "
    "format must be exact.\n"
    "- If the keyframes and transcript do not contain the answer, say so plainly "
    "instead of guessing.\n"
    "- When the user asks you to find or identify a specific moment ('the frame "
    "where…', 'show me…', 'when does…'), examine each keyframe, pick the single "
    "best match, and give its timecode; if several match, list them best-first.\n"
    "- Use the prior conversation for context on follow-up questions. If the user "
    "asks you to re-check or verify something, look again carefully before replying.\n\n"
    "FORMATTING RULES — follow these exactly:\n"
    "- Write in clear, natural prose. Do NOT use any Markdown syntax: no asterisks "
    "(*), no double asterisks for bold, no underscores for emphasis, no '#' "
    "headings, and no backticks. Plain text only.\n"
    "- When a list helps, put each item on its own line beginning with a single "
    "hyphen and a space ('- '). Never mark up an item with asterisks. If an item "
    "has a label, write it as 'Label: description'.\n"
    "- Structure longer answers as a short summary sentence followed by the "
    "supporting details. Keep it focused — do not pad the answer."
)


def _data_url_from_key(key: str) -> str | None:
    try:
        raw = storage.get_bytes(key)
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not load frame %s: %s", key, exc)
        return None
    ext = key.rsplit(".", 1)[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def prompt_node(state: RAGState) -> RAGState:
    retrieved: list[RetrievedItem] = state.get("retrieved", [])

    transcript_items = [r for r in retrieved if r.type == "transcript"]
    frame_items = sorted((r for r in retrieved if r.type == "frame"), key=lambda r: r.timestamp)

    context_lines = [f"[{format_timestamp(r.timestamp)}] {r.text}" for r in transcript_items if r.text]
    transcript_block = "\n".join(context_lines) if context_lines else "(no transcript available)"

    content: list[dict] = [
        {
            "type": "text",
            "text": (
                f"Question: {state['question']}\n\n"
                f"Transcript excerpts:\n{transcript_block}\n\n"
                f"Keyframes (in order) follow."
            ),
        }
    ]

    references: list[Reference] = []
    for r in frame_items:
        data_url = _data_url_from_key(r.frame_path)  # frame_path holds the S3 key
        if data_url is None:
            continue
        content.append({"type": "text", "text": f"Frame at {format_timestamp(r.timestamp)} ({r.timestamp:.1f}s):"})
        content.append({"type": "image_url", "image_url": {"url": data_url}})
        references.append({"timestamp": r.timestamp, "frame_path": storage.presigned_url(r.frame_path)})

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    # prior turns (plain text) for conversational memory
    for turn in state.get("history", []) or []:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": content})

    return {"messages": messages, "references": references}
