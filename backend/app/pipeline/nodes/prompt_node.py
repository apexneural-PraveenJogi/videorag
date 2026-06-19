"""Prompt: build the OpenRouter multimodal messages array + references."""
from __future__ import annotations

from pathlib import Path

from app.config import get_settings
from app.pipeline.state import RAGState, Reference
from app.services.vector_store import RetrievedItem
from app.utils.frame_utils import encode_frame_data_url
from app.utils.timestamp_utils import format_timestamp

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions about a video. "
    "You are given a transcript excerpt and several keyframes, each tagged with a "
    "timestamp. Answer using only this evidence and cite the relevant timestamps "
    "(e.g. 'at 2:01'). If the evidence does not contain the answer, say so plainly."
)


def _disk_path(frame_url: str) -> Path:
    # frame_url looks like "/frames/<video_id>/<name>"; map to storage/frames/<video_id>/<name>
    name = frame_url.rsplit("/", 1)[-1]
    video_id = frame_url.rstrip("/").split("/")[-2]
    return get_settings().frames_dir / video_id / name


def prompt_node(state: RAGState) -> RAGState:
    retrieved: list[RetrievedItem] = state.get("retrieved", [])

    transcript_items = [r for r in retrieved if r.type == "transcript"]
    frame_items = [r for r in retrieved if r.type == "frame"]

    # Transcript context block
    context_lines = [
        f"[{format_timestamp(r.timestamp)}] {r.text}" for r in transcript_items if r.text
    ]
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
        try:
            data_url = encode_frame_data_url(_disk_path(r.frame_path))
        except FileNotFoundError:
            continue
        content.append({
            "type": "text",
            "text": f"Frame at {format_timestamp(r.timestamp)} ({r.timestamp:.1f}s):",
        })
        content.append({"type": "image_url", "image_url": {"url": data_url}})
        references.append({"timestamp": r.timestamp, "frame_path": r.frame_path})

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]
    return {"messages": messages, "references": references}
