# VideoRAG

Upload a video, ask natural-language questions, get answers grounded in the
video's **keyframes + transcript**, with clickable timestamp references. Answer
generation runs on a **vision model** — extracted keyframes are sent as images
alongside the transcript, so the model reasons over what was *shown*, not just said.

```
React (Vite/Tailwind/Zustand) ──HTTP/SSE──> FastAPI
                                              │  services: video_processor · transcriber · embedder · vector_store
                                              │  pipeline (LangGraph): ingest → retrieve → prompt → generate
                                              └  FFmpeg/OpenCV · faster-whisper · ChromaDB · OpenRouter
```

## URLs

| | Local dev | Docker |
|---|---|---|
| Frontend | http://localhost:5173 | http://localhost:8080 |
| Backend API | http://localhost:8000/api/v1 | proxied under the frontend at `/api/v1` |
| API docs (Swagger) | http://localhost:8000/docs | — |
| Health | http://localhost:8000/api/v1/health | — |

## Configure keys

A **single `OPENROUTER_API_KEY`** powers everything — both the vision model that
writes answers and the embeddings used for retrieval (OpenRouter exposes an
OpenAI-compatible `/embeddings` route, and the embedder falls back to this key).
The app boots and extracts frames/transcript without it, but indexing and
answering need it.

```bash
cd backend
cp .env.example .env      # then set OPENROUTER_API_KEY
```

## Run — local dev

```bash
# Backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (new terminal) — proxies /api and /frames to :8000
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Requires `ffmpeg` on the host (OpenCV + faster-whisper use it). The first upload
downloads the Whisper model (~140 MB for `base`).

## Run — Docker

```bash
export OPENROUTER_API_KEY=sk-or-...      # one key covers vision + embeddings
docker compose up --build                # http://localhost:8080
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/videos/upload` | Upload a video (multipart `file`); starts ingest |
| GET | `/api/v1/videos/{id}` | Processing status / progress |
| GET | `/api/v1/videos/{id}/frames` | Extracted keyframes |
| GET | `/api/v1/videos/{id}/stream` | Source video (Range-enabled, for the player) |
| POST | `/api/v1/query` | Ask a question (JSON answer + references) |
| POST | `/api/v1/query/stream` | Same, streamed as SSE |
| GET | `/api/v1/models` | Vision models offered in the UI |
| GET | `/api/v1/health` | Health + config flags |
