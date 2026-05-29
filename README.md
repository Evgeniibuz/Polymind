# Polymind

**AI intelligence for prediction markets** — a Bloomberg-terminal-style trading desk for Polymarket and Kalshi.

Polymind monitors signals across X, Telegram, Reddit, news, YouTube, and onchain flow, derives true probabilities, surfaces mispricings, tracks whales, and executes trades through configurable bots.

```
polymind/
├── backend/        # FastAPI · Postgres · Redis · Celery — deploy to Railway
└── frontend/       # Next.js 14 App Router · TypeScript · Tailwind — deploy to Vercel
```

---

## Architecture

- **Backend** — FastAPI on Python 3.11+, async SQLAlchemy → Postgres, Redis for cache + queues, Celery workers for scanning, WebSocket streams for live signals.
- **Frontend** — Next.js 14 (App Router) + Tailwind. Auth via Phantom wallet (Solana) or Google Sign-In. SWR for data fetching, native WebSocket for the signal stream.
- **Integrations** — Polymarket (Gamma + CLOB), Kalshi, Twitter/X, Telegram, Reddit, news RSS feeds, YouTube transcripts, onchain whale tracking.

---

## Local development

### 1. Backend

```bash
cd backend

# install
python -m venv .venv
source .venv/bin/activate
pip install -e .

# configure
cp .env.example .env
# edit .env — at minimum set: DATABASE_URL, REDIS_URL, SECRET_KEY, JWT_SECRET

# run migrations
alembic upgrade head

# start API
uvicorn app.main:app --reload --port 8000

# in another terminal: start Celery worker
celery -A app.workers.celery_app worker --loglevel=info
```

API: `http://localhost:8000` · OpenAPI docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# at minimum set:
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
#   NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

npm run dev
```

App: `http://localhost:3000`

---

## Production deployment

### Backend → Railway

The backend ships with a `Dockerfile` and `railway.toml` and is ready to deploy.

1. **Create a Railway project** and connect this repo (or push the `backend/` subdirectory).
2. **Add plugins:** Postgres and Redis. Railway will auto-inject `DATABASE_URL` and `REDIS_URL`.
3. **Set environment variables** (Railway dashboard → Variables):

   | Variable | Required | Notes |
   |---|---|---|
   | `SECRET_KEY` | ✅ | Random 64-char string |
   | `JWT_SECRET` | ✅ | Random 64-char string |
   | `CORS_ORIGINS` | ✅ | `https://your-vercel-domain.vercel.app` |
   | `GOOGLE_CLIENT_ID` | optional | For Google sign-in verification |
   | `POLYMARKET_PRIVATE_KEY` | optional | If using CLOB execution |
   | `KALSHI_API_KEY` / `KALSHI_API_SECRET` | optional | For Kalshi integration |
   | `TWITTER_BEARER_TOKEN` | optional | X / Twitter scanner |
   | `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | optional | Telegram scanner |
   | `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | optional | Reddit scanner |
   | `OPENAI_API_KEY` | optional | For the signal LLM analyzer |

4. **Deploy.** Railway will build via `Dockerfile`. Migrations run automatically on first start (see `app/main.py` startup hook). Two services are recommended: one for the API (port 8000) and one for the Celery worker (start command: `celery -A app.workers.celery_app worker --loglevel=info`).

Your API URL will be `https://<your-project>.up.railway.app`.

### Frontend → Vercel

1. **Import project** in Vercel, point to the repo root.
2. **Root directory:** `frontend`
3. **Build settings:** Vercel auto-detects Next.js — defaults are correct.
4. **Environment variables:**

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://<your-railway-project>.up.railway.app` |
   | `NEXT_PUBLIC_WS_BASE_URL` | `wss://<your-railway-project>.up.railway.app` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID (optional) |
   | `NEXT_PUBLIC_TWITTER_URL` | Your X / Twitter profile URL (optional — leave empty to disable footer icon) |
   | `NEXT_PUBLIC_PHANTOM_ENABLED` | `true` (default) |

5. **Deploy.**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind 3.4, SWR, zustand |
| Auth | Phantom (Solana), Google Sign-In |
| Backend | FastAPI, SQLAlchemy 2 async, Alembic, Pydantic v2 |
| Storage | Postgres, Redis |
| Workers | Celery |
| Realtime | Native WebSocket (`/api/v1/signals/stream`) |
| Hosting | Vercel (frontend) · Railway (backend) |

---

## API surface

All endpoints under `/api/v1`. Highlights:

- `POST /auth/phantom/{nonce,verify}` · `POST /auth/google/verify` · `POST /auth/refresh` · `GET /auth/me`
- `GET /markets` · `GET /markets/{id}` · `GET /markets/{id}/history`
- `GET /signals` · `GET /signals/{id}` · `WS /signals/stream`
- `GET|POST|PATCH|DELETE /bots` · `/bots/{id}`
- `GET|POST /positions` · `POST /positions/{id}/close`
- `GET /whales` · `GET /whales/recent` · `GET /whales/flow`
- `GET /analytics/arbitrage` · `GET /analytics/dashboard/stats` · `GET /analytics/dashboard/portfolio`

Full schema: `http://localhost:8000/docs` once the backend is running.

---

## Notes

- Trading involves substantial risk of loss. Polymind surfaces information and automates execution — it does not guarantee outcomes.
- All data shown in the terminal is fetched from your connected backend. There are no mocks or seed data baked into the frontend.
- The Twitter icon in the footer is wired to `NEXT_PUBLIC_TWITTER_URL` — set it once you have a handle.

---

© Polymind
