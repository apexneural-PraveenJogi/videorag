# VideoRAG — Production Hardening + Landing Page

**Date:** 2026-06-19
**Builds on:** `2026-06-19-videorag-mvp-design.md` (MVP is complete and runs E2E)
**Scope (approved):** Frontend polish/robustness · Backend hardening · Deploy/ops · New animated landing page. **Out of scope:** auth/multi-user.

## Goal

Take the working MVP to a production-quality feel: a polished, animated marketing landing page that leads into the app, a frontend that never white-screens and handles every state gracefully, a backend that logs/limits/cleans up, and a deploy setup that is reproducible with healthchecks and CI.

## 1. Routing restructure

| Route | Page |
|---|---|
| `/` | New marketing landing (animated) |
| `/app` | Upload screen + "Your videos" library |
| `/app/video/:id` | Player + chat (moved from `/video/:id`) |

`react-router` nested routes under `/app`. Landing CTA → `/app`. Header adapts: minimal on landing, app-nav inside `/app`.

## 2. Landing page

Single scrolling page. Sections:
- **Hero** — animated headline + subcopy, ambient gradient backdrop (CSS), primary CTA "Try it free" → `/app`, secondary "How it works" anchor.
- **How it works** — 3 steps (Upload → Process → Ask) with icons, staggered scroll-reveal.
- **Features** — grid: vision grounding, timestamp citations, streaming answers, model picker, local-first storage, fast keyframe retrieval.
- **Demo strip** — looping mock chat exchange showing an answer with a clickable timestamp + frame thumb.
- **Footer CTA** — repeat CTA + minimal footer.

**Animation:** `framer-motion` for entrance/stagger/scroll-reveal; CSS for ambient gradient motion. Respect `prefers-reduced-motion`.

**Design tokens (artifact-design):** committed palette + type scale defined in `tailwind.config.js` (extend) and documented in the landing component. Direction chosen by implementer; modern, distinctive, not template-like. Palette decided before building and surfaced to the user.

## 3. Frontend robustness

- **`ErrorBoundary`** component wrapping the router; fallback screen with reload + "back home". Prevents the white-screen failure class.
- **States everywhere:** loading spinners, empty states (no videos, no messages), error states with retry.
- **Toasts:** lightweight context-based toast for upload/query/delete errors and successes (replaces inline-only errors).
- **Responsive:** landing fully responsive; app player+chat stack vertically under `lg`.
- **Library:** `/app` lists prior videos (from `GET /videos`), each linking to its page, with delete.

## 4. Backend hardening

- **Logging:** stdlib `logging` configured at startup; request timing middleware; pipeline stage logs (extract/transcribe/index/query) with video_id + durations.
- **Ingestion concurrency:** module-level `threading.Semaphore(INGEST_CONCURRENCY)` (default 2) so CPU-heavy whisper jobs don't thrash; status shows `queued` while waiting.
- **New endpoints:**
  - `GET /videos` → list all videos (id, filename, status, counts, duration).
  - `DELETE /videos/{id}` → remove video dir, frames dir, and Chroma collection; idempotent.
- **Rate limiting:** `slowapi` limiter on `/videos/upload`, `/query`, `/query/stream` (sane per-minute defaults, env-tunable).
- **Readiness:** keep `/health` (liveness). Health payload already reports config; add `whisper_model` + `ingest_concurrency`.

## 5. Deploy & ops

- **Compose:** healthchecks (backend curl `/health`, frontend curl `/`), `restart: unless-stopped`, named volume (exists).
- **`.dockerignore`** for backend (`.venv`, `storage`, `chroma_db`, `__pycache__`) and frontend (`node_modules`, `dist`).
- **`Makefile`:** `dev` (run both locally), `up`/`down`/`logs` (compose), `build`.
- **CI:** GitHub Actions — job 1 frontend `npm ci && npm run build`; job 2 backend `pip install` + import/smoke (`python -c "from app.main import app"`); job 3 `docker build` both images.
- **`.env.example`** already reflects single-OpenRouter-key setup.

## Verification

`vite build` clean; backend imports + boots; `GET /videos`, `DELETE /videos/{id}`, rate limits return expected codes; landing renders and animates; ErrorBoundary catches a forced throw; full upload→ask E2E still passes with the live key.

## Deviations / decisions

1. `framer-motion` added (~35KB gz) for animation quality — approved.
2. GitHub Actions for CI — approved.
3. No auth (kept out per scope) — library is global/single-tenant for now.
