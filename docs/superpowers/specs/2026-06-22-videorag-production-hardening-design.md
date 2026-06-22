# VideoRAG — Production Hardening Design

**Date:** 2026-06-22
**Status:** Approved for planning
**Scope:** Harden an already-working video-RAG application for single-VM / Docker production. No re-architecture, no distributed infrastructure.

## Context

The application already works end-to-end: register → login → upload video → background ingest (frame extraction + Whisper transcription → embeddings → ChromaDB) → query (cosine retrieval → multimodal prompt → OpenRouter LLM) → answer with frame references. Auth (bcrypt + JWT) is implemented and all video/query endpoints are scoped per user.

This effort is a **hardening and verification pass**, not new product surface. The goal: make the existing flow secure, reliable, and produce better retrieval results, then prove it works end-to-end with a runnable single-VM/Docker setup.

**Deployment target:** one server (or docker-compose). Local ChromaDB (persisted to a mounted volume), Postgres, and S3 are acceptable — no hosted vector DB, no multi-instance HA.

**Non-goals (explicitly out of scope):** distributed/clustered ChromaDB, MFA/2FA, email verification, multi-tenant billing/quotas, switching the vector store, OCR, CLIP visual embeddings, audit-log subsystem.

## Architecture (unchanged)

```
Frontend (React/Vite)  ──REST──▶  FastAPI
                                   ├─ /auth      (register, login, me, refresh*)
                                   ├─ /videos    (upload, list, get, delete, stream, frames)
                                   └─ /query     (query, query_stream)

FastAPI ingest (background task): S3 video ──▶ ffmpeg frames + Whisper transcript
                                   ──▶ chunk + caption ──▶ embeddings ──▶ ChromaDB (per-video collection)

FastAPI query (LangGraph): retrieve (Chroma) ──▶ prompt (transcript + frames) ──▶ generate (OpenRouter)

Postgres: users, videos, chat history.   S3: videos + frames.   ChromaDB: vectors (mounted volume).
```
(* `/auth/refresh` is the only new endpoint.)

## Work, by priority area

### 1. Security hardening

- **JWT secret guard.** Add an `app_env` setting (`development` | `production`). On startup, if `app_env == "production"` and `jwt_secret == "change-me-in-production"` (or empty), raise and refuse to boot. Add `.env.example` documenting `openssl rand -hex 32`.
- **Strict production config validation.** On startup in production mode, fail loudly if S3 or `DATABASE_URL` is unconfigured, instead of degrading to first-request failures. In development, keep current warning behavior.
- **Rate-limit auth endpoints.** Apply the existing slowapi limiter to `/auth/register` and `/auth/login` (default `5/minute`, configurable via `rate_limit_auth`). Keyed by client IP.
- **Password policy.** Backend validator on `RegisterRequest`: 8–128 chars, at least one letter and one digit. Align frontend register/login validation and messaging; fix the current login-vs-register min-length inconsistency.
- **Token lifetime + refresh (token-storage decision).** Keep bearer tokens in `localStorage` (low-risk, preserves the working flow; frontend+API served behind one nginx origin in prod). Shorten the access token to ~60 min and add a `/auth/refresh` endpoint that issues a fresh access token from a longer-lived refresh token (7 days). Frontend stores both, refreshes the access token on a 401 once before redirecting to login. HttpOnly-cookie migration is documented as a future option but NOT implemented here.

### 2. Retrieval quality

- **Bound `top_k`.** Clamp the request-supplied `top_k` server-side to 1–20 (default 5).
- **Similarity score threshold.** Drop retrieved chunks whose cosine similarity is below a configurable floor (`retrieval_min_score`, default `0.25`, tunable during verification) so weak matches don't pad the prompt. If everything is below the floor, fall back to the single best match rather than returning nothing.
- **Transcript chunking.** At ingest, embed merged sentence-window chunks (configurable target ~1–2 sentences / ~N seconds) instead of raw Whisper segments, so retrieved context is coherent. Store chunk start/end timestamps in metadata.
- **Visual captions for silent frames.** When a keyframe has no overlapping transcript (currently captioned `"Video keyframe at Ns"`), generate a short visual caption via one vision-model call per such frame at ingest time, cached in metadata. This makes silent/no-dialogue scenes searchable. (Most expensive item; gated by a config flag `enable_visual_captions`, default on.)
- **Order frames by timestamp.** In prompt assembly, sort retrieved frames by timestamp before sending to the LLM so the visual narrative is coherent (currently distance-ordered).

### 3. Reliability

- **Eliminate silent failures.** Transcription, frame-load, and chat-memory currently swallow exceptions. Replace with: log at error level, and for ingest-stage failures record a structured error on the video row (`status="failed"`, human-readable `error`). Surface that error to the UI via the existing status field.
- **Ingest retry + stuck-job detection.** Wrap the ingest task with bounded retries (e.g. 2) and exponential backoff for transient failures (S3, embedding API). Add a per-job timeout so a hung job is marked `failed` and releases the concurrency semaphore instead of blocking the queue forever.
- **Graceful degradation of chat memory.** If Postgres / chat history is unavailable, queries still answer (without history) and the response indicates history is disabled, rather than failing opaquely. Keep this best-effort but observable (logged, and a flag in the response).
- **Generation robustness.** Add one retry on transient OpenRouter errors and make the `HTTP-Referer` header derive from config (not hardcoded `localhost:5173`).

### 4. Verify it works

- **End-to-end verification pass.** Run the real flow: register → login → upload a short sample clip → poll ingest to `ready` → ask a question → confirm a grounded answer citing frame references. Capture evidence (command output / screenshots).
- **Runnable single-VM setup.** `docker-compose.yml` (api + postgres + frontend served by nginx, ChromaDB on a mounted volume), `.env.example`, and a README section: run locally and deploy on one VM. ChromaDB volume persists across restarts.
- **Smoke tests.** A pytest suite (or shell script) covering the auth happy path (register, login, /me, refresh, rate-limit triggers 429) and the query happy path against a small fixture, runnable in CI/locally.

## Data flow changes

- **Ingest** gains a chunking step (merge Whisper segments into windows) and an optional visual-captioning step (vision call for transcript-less frames). Embedding now operates on chunks + frame captions; ChromaDB metadata carries chunk/ frame timestamps.
- **Retrieve** clamps `top_k` and applies a score threshold; returns similarity scores alongside results.
- **Prompt** sorts frames by timestamp; derives referer from config.
- **Query response** includes a `history_enabled` flag.

## Error handling

- Startup: hard-fail in production on missing critical config; warn in development.
- Ingest: structured failure recorded on the video row + surfaced to UI; retries with backoff; per-job timeout.
- Query: chat-memory degradation is non-fatal and reported; generation retried once on transient errors.
- Auth: rate-limited; clear 4xx messages; refresh path on access-token expiry.

## Testing

- **Unit:** password-policy validator, `top_k` clamping, score-threshold fallback, transcript chunker, JWT secret guard.
- **Integration / smoke:** auth happy path + rate-limit 429; query happy path on a fixture video; ingest failure recording.
- **Manual E2E:** the full register→answer pass with captured evidence, plus a `docker-compose up` cold-start check (ChromaDB persists across restart).

## Config additions (summary)

`app_env`, `rate_limit_auth`, `access_token_expire_minutes`, `refresh_token_expire_minutes`, `retrieval_min_score`, `top_k_max`, `transcript_chunk_*`, `enable_visual_captions`, `public_base_url` (for referer). All with sensible defaults; documented in `.env.example`.
