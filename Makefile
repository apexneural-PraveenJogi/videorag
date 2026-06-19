.PHONY: dev dev-backend dev-frontend install up down logs build

# Local dev runs the backend and frontend in two separate terminals.
dev:
	@echo "Run these in two separate terminals:"
	@echo "  make dev-backend   # FastAPI on http://localhost:8000"
	@echo "  make dev-frontend  # Vite on http://localhost:5173"

dev-backend:
	cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# Create the backend venv + install deps, then install frontend deps.
install:
	cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
	cd frontend && npm install

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build
