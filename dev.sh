#!/usr/bin/env bash
# Start VideoRAG locally: backend (FastAPI :8000) + frontend (Vite :5173).
# Both are detached (setsid) so they keep running after this script returns.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Stopping any previous instances..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

echo "Starting backend on http://127.0.0.1:8000 ..."
cd "$ROOT/backend"
setsid .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
  >/tmp/vr-backend.log 2>&1 < /dev/null &
echo "  backend started (logs: /tmp/vr-backend.log)"

echo "Starting frontend on http://localhost:5173 ..."
cd "$ROOT/frontend"
setsid npm run dev >/tmp/vr-frontend.log 2>&1 < /dev/null &
echo "  frontend started (logs: /tmp/vr-frontend.log)"

echo "Waiting for backend to come up..."
for i in $(seq 1 20); do
  if curl -s -m3 -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/v1/health 2>/dev/null | grep -q 200; then
    break
  fi
  sleep 1
done

echo
echo "Backend health: $(curl -s -m4 http://127.0.0.1:8000/api/v1/health 2>/dev/null || echo 'not up yet — check /tmp/vr-backend.log')"
echo
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000/api/v1/health"
echo "  API docs:  http://localhost:8000/docs"
echo
echo "To stop both:  pkill -f 'uvicorn app.main'; pkill -f vite"
