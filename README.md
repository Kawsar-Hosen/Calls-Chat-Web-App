# XYTEEE

XYTEEE is a localhost-first direct messaging platform monorepo with a React web client, an Expo mobile client, and a FastAPI/PostgreSQL backend.

## Applications

- `apps/web`: React 19, TypeScript, Vite. Runs at `http://localhost:3000`.
- `apps/api`: FastAPI, SQLAlchemy async, Alembic, JWT, WebSockets. Runs at `http://localhost:8000`; docs at `http://localhost:8000/docs`.
- `apps/mobile`: Expo Router, React Native, TypeScript, Secure Store, Expo Notifications.

## Local Setup

Prerequisites are Node 22+, Python 3.11+, and PostgreSQL 16+. Docker Compose is the simplest way to run PostgreSQL.

```bash
docker compose up -d postgres
cd apps/api
cp .env.example .env
python -m venv .venv
. .venv/bin/activate
pip install -e '.[test]'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
npm install
npm run dev:web
```

Open `http://localhost:3000`. For a quick backend-only run without PostgreSQL, set `DATABASE_URL=sqlite+aiosqlite:///./xyteee.db` before running Alembic. SQLite is a test/development escape hatch, not the production database.

Mobile setup is documented in `apps/mobile/README.md`. Android emulators use `10.0.2.2` for the host machine; physical devices need the host LAN address in `EXPO_PUBLIC_API_URL`.

## Implemented

Authentication and rotating sessions, profiles and avatars (client-side resize + server-side square crop, live upload progress), search, friend requests, blocking and blacklist, direct conversations, permission-checked message history, real-time text/typing/presence, replies, edits, soft deletion, reactions, read/unread state, message search, validated media upload, group conversations with membership roles and join applications, responsive dark/light web UI with RTL language support, Expo mobile client, and device push-token registration.

The WebSocket manager and rate limiter are intentionally single-process foundations. Before horizontal scaling, move fan-out, presence, and rate-limit state to Redis. Production media should use an object-storage implementation of `Storage`; local disk is only the development adapter. Sending FCM/Expo notifications, calls, moderation tooling, and production observability remain second-half work.

## Railway

Create a Railway PostgreSQL service and an API service rooted at `apps/api`. Railway uses `apps/api/railway.toml` and the Dockerfile. Set `DATABASE_URL` to Railway's PostgreSQL URL with the async driver form (`postgresql+asyncpg://...`), plus unique `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, storage credentials, and FCM credentials. The container runs migrations before starting and exposes `/api/v1/health` for health checks.

The web client is independent of Railway during development. For production, set `VITE_API_URL` and `VITE_WS_URL` to the deployed API HTTPS/WSS endpoints when building it.

## Source Control

The repository is initialized for Git and includes GitHub Actions checks for API tests, strict TypeScript, and the web production build. Add your GitHub remote when the repository is created: `git remote add origin <repository-url>`.
