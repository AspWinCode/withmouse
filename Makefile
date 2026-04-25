.PHONY: up down build seed logs restart clean dev-backend dev-frontend

# ── Docker ────────────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# Заполнить БД начальными данными
seed:
	docker compose exec backend python seed.py

# Применить миграции
migrate:
	docker compose exec backend alembic upgrade head

# ── Очистка ───────────────────────────────────────────────────────────────
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# ── Локальная разработка ──────────────────────────────────────────────────
dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

dev-seed:
	cd backend && python seed.py

# ── Тесты/линтинг ────────────────────────────────────────────────────────
lint-frontend:
	cd frontend && npm run lint
