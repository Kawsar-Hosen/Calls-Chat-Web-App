# Xyteee API

FastAPI messaging backend using SQLAlchemy async, separately signed JWT access/refresh sessions, PostgreSQL, and Alembic.

## Run locally

```bash
cp .env.example .env
python -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

OpenAPI is available at `http://localhost:8000/docs`. All application endpoints use `/api/v1`; websocket clients connect to `/api/v1/ws?token=<access-token>`.

For SQLite development or tests, set `DATABASE_URL=sqlite+aiosqlite:///./xyteee.db`. Local validated media uploads are served from `/uploads`; production deployments must provide an object-storage implementation of `Storage` from `app/storage.py`.

## Test

```bash
pytest -q
```

The in-memory websocket and rate-limit state is suitable for one process. Multi-worker production deployments should replace these with a shared Redis pub/sub and rate-limit implementation.
