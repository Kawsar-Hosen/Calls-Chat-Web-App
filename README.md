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

Authentication and rotating sessions, profiles and avatars (client-side resize + server-side square crop, live upload progress), search, friend requests, blocking and blacklist, direct conversations, permission-checked message history, real-time text/typing/presence, replies, edits, soft deletion, reactions, read/unread state, message search, validated media upload, group conversations with membership roles and join applications, responsive dark/light web UI with RTL language support, Expo mobile client, device push-token registration, FCM push notifications (messages + incoming calls), and real WebRTC audio/video calls over Cloudflare TURN with persisted pending offers.

The WebSocket manager and rate limiter are intentionally single-process foundations. Before horizontal scaling, move fan-out, presence, and rate-limit state to Redis. Production media uses the R2 object-storage backend. Moderation tooling, production observability, and background-call hardening (Android foreground service, iOS CallKit/VoIP push) remain second-half work.

## Railway

Create a Railway PostgreSQL service and an API service rooted at `apps/api`. Railway uses `apps/api/railway.toml` and the Dockerfile. The container runs `alembic upgrade head` before starting and exposes `/api/v1/health` for health checks.

Required environment variables:

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@host:5432/xyteee` | Railway Postgres URL in async form |
| `JWT_SECRET` | random 32+ chars | unique per environment |
| `JWT_REFRESH_SECRET` | random 32+ chars | different from `JWT_SECRET` |
| `CORS_ORIGINS` | `https://xyteee.com,https://admin.xyteee.com` | comma-separated production origins |
| `STORAGE_BACKEND` | `r2` | local disk is development only |
| `STORAGE_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` | Cloudflare R2 |
| `STORAGE_BUCKET` | `xyteee-storage` | |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | R2 keys | |
| `STORAGE_PUBLIC_URL` | `https://cdn.xyteee.com` | must be HTTPS for production media |
| `TURN_KEY_ID` / `TURN_API_TOKEN` | Cloudflare Calls TURN token | required for WebRTC calls |
| `FCM_PROJECT_ID` | Firebase project id | push notifications |
| `FCM_CREDENTIALS_JSON` | service-account JSON (single env var, `\n` escaped) | Firebase admin SDK credentials |
| `FCM_CREDENTIALS_FILE` | path to service-account JSON file | alternative to `FCM_CREDENTIALS_JSON` for local dev |
| `SMTP_*` | Gmail app password | account-deletion verification email |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID | required for Google sign-in; accepts ID tokens from Web/Expo/Android/iOS clients listed in `GOOGLE_ANDROID_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` |

Push notifications require a Firebase project: on Android the app needs `google-services.json` wired into the `expo-notifications` plugin (see `apps/mobile`), and on iOS the Firebase service account must be registered in the Firebase console. Without FCM credentials the API logs and skips sends, so the app keeps working.

The web client is independent of Railway during development. For production, set `VITE_API_URL` and `VITE_WS_URL` to the deployed API HTTPS/WSS endpoints when building it, and on mobile set `EXPO_PUBLIC_API_URL` to the HTTPS API origin.

## Source Control

The repository is initialized for Git and includes GitHub Actions checks for API tests, strict TypeScript, and the web production build. Add your GitHub remote when the repository is created: `git remote add origin <repository-url>`.
