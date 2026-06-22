# Running VideoRAG

## Local development
1. Backend: `cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt`
2. Copy env: `cp backend/.env.example backend/.env` and fill `OPENROUTER_API_KEY`, `EMBEDDING_*`, and AWS S3 keys.
3. Start Postgres (any local instance) and set `DATABASE_URL`.
4. Run API: `cd backend && .venv/bin/uvicorn app.main:app --reload`
5. Run frontend: `cd frontend && npm install && npm run dev` (proxies `/api` → `:8000`).

## Single-VM / Docker deployment
1. `cp backend/.env.example backend/.env`
2. Set `APP_ENV=production`, a strong `JWT_SECRET` (`openssl rand -hex 32`), `OPENROUTER_API_KEY`, `EMBEDDING_*`, and AWS S3 credentials. Leave `DATABASE_URL` as the compose default (it points at the `db` service).
3. `docker compose up --build -d`
4. Open `http://<host>:8080`. The API is proxied at `/api`.
5. ChromaDB persists in the `chroma` volume; Postgres in `pgdata`. Both survive `docker compose restart`.

The API refuses to boot in production if `JWT_SECRET`, `DATABASE_URL`, or S3 are missing/default (see `config_validation.py`).
