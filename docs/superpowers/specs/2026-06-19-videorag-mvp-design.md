# VideoRAG MVP — Design Doc

**Date:** 2026-06-19
**Scope:** PRD Phases 1–3 (full MVP, no auth/Celery/S3)
**Source:** VideoRAG_PRD.docx v1.0.0

## Goal

A runnable full-stack platform: upload a video, ask natural-language questions, get answers grounded in frames + transcript with timestamp references. `docker-compose up` brings up the whole stack once `OPENROUTER_API_KEY` is set.

## Architecture

```
React (Vite/Tailwind/Zustand)  ──HTTP/SSE──>  FastAPI
                                                 │
                          ┌──────────────────────┼─────────────────────┐
                          │ services             │ pipeline (LangGraph) │
                          │  video_processor     │  ingest_node         │
                          │  transcriber         │  retrieve_node       │
                          │  embedder            │  prompt_node         │
                          │  vector_store        │  generate_node       │
                          └──────────────────────┴─────────────────────┘
                                   FFmpeg/OpenCV · faster-whisper · ChromaDB · OpenRouter
```

## Backend

- **Upload flow:** validate MIME server-side, sanitize filename, save to `storage/videos/<id>/`, kick off ingest as a FastAPI `BackgroundTask`. Status tracked in an on-disk `status.json` per video (`queued|processing|ready|failed`, progress %, error).
- **Ingest (LangGraph `ingest_node`):** FFmpeg/OpenCV extract keyframes at `FRAME_EXTRACT_FPS` → JPEG in `storage/frames/<id>/frame_<sec>.jpg`; faster-whisper transcribes audio → timestamped segments; embed transcript chunks + frame captions/metadata; store in ChromaDB collection `video_<id>` with timestamp metadata.
- **Query flow:** `retrieve_node` embeds the question, queries ChromaDB top-K (frames + transcript); `prompt_node` base64-encodes selected frames and builds OpenRouter multimodal `messages[]`; `generate_node` calls the OpenRouter vision model. Two endpoints: `POST /query` (JSON) and streaming SSE variant for first-token latency.
- **Embeddings:** OpenAI-compatible `/embeddings` call using `OPENROUTER_API_KEY`; `EMBEDDING_BASE_URL` env configurable (default OpenRouter; switchable to OpenAI if OpenRouter 404s).
- **Endpoints:** `POST /api/v1/videos/upload`, `GET /api/v1/videos/{id}`, `GET /api/v1/videos/{id}/frames`, `POST /api/v1/query`, `POST /api/v1/query/stream`, `GET /api/v1/health`. Static mount serves frames.

## Frontend

- **HomePage:** drag-drop dropzone, client + server file validation, upload progress, redirect to VideoPage on ready (poll status via `useVideoStatus`).
- **VideoPage:** HTML5 player + frame strip; chat window with streaming answers (`useQuery`), `MessageBubble`, inline `FrameReference` thumbnails (click → seek player to timestamp), model selector, follow-up questions (chat history in Zustand `chatStore`).
- **Services:** axios instance (`api.js`), `videoService`, `queryService` (SSE stream consume). Stores: `videoStore`, `chatStore`.

## Deviations from PRD (approved)

1. Embeddings through OpenRouter key (configurable base URL) — OpenRouter may not serve embeddings; env-swappable.
2. `faster-whisper` instead of `openai-whisper` (faster CPU, lighter image; same `WHISPER_MODEL`).
3. Frames as JPEG not PNG (smaller base64 payloads; configurable).
4. In-memory + on-disk status instead of a DB (no DB in MVP).

## Out of scope

Auth/JWT, Celery, S3, multi-user (PRD Phase 4).

## Verification

Backend imports resolve, app boots, `/health` + `/docs` respond; frontend `vite build` succeeds. Full live ingest (ffmpeg binaries + whisper model download + embeddings host) not executed in this session.
