# Polymind Backend

AI intelligence backend for prediction markets — the engine behind the Polymind terminal.

Scans social/news/onchain sources, estimates true event probabilities with an LLM,
detects mispricing against Polymarket/Kalshi odds, tracks whale wallets, and runs
autonomous trading bots.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Data       │────▶│  Ingestion   │────▶│  ingested_events│
│  Sources    │     │  (workers)   │     │  (Postgres)     │
│  X·TG·RDT·  │     └──────────────┘     └────────┬────────┘
│  News·Chain │                                    │
└─────────────┘                                    ▼
                     ┌──────────────┐     ┌─────────────────┐
┌─────────────┐     │  Probability │◀────│  AI Engine      │
│ Polymarket  │────▶│  Engine      │     │  (Claude + emb) │
│ Gamma API   │     │  (workers)   │     └─────────────────┘
└─────────────┘     └──────┬───────┘
                           │ creates
                           ▼
                    ┌─────────────┐  Redis pub/sub   ┌──────────────┐
                    │   signals   │─────────────────▶│ WS /signals  │
                    └──────┬──────┘                  │ /stream      │
                           │ matches                 └──────────────┘
                           ▼
                    ┌─────────────┐     ┌─────────────────┐
                    │    bots     │────▶│  TradingService │──▶ Polymarket CLOB
                    └─────────────┘     │  (paper / live) │
                                        └─────────────────┘
```

**Stack:** FastAPI (async) · PostgreSQL (SQLAlchemy 2.0 + Alembic) · Redis · Arq workers
· Claude API · Polymarket Gamma + CLOB · JWT auth (Phantom ed25519 + Google OAuth)

---

## Project layout

```
app/
  api/v1/         REST + WebSocket endpoints
  core/           config, security (JWT), phantom/google auth, redis, logging
  db/             SQLAlchemy base + session
  models/         ORM models (User, Market, Signal, Bot, Position, Whale, Event)
  schemas/        Pydantic request/response models
  services/       business logic (market sync, ingest, signals, bots, trading, whales)
  integrations/   external APIs (polymarket, twitter, reddit, news, onchain)
  ai/             Claude client, embeddings, probability engine, scoring
  workers/        Arq tasks + cron schedule
  main.py         FastAPI app
alembic/          migrations
scripts/seed.py   demo data
tests/            smoke tests
```

---

## Local development

### Prerequisites
- Python 3.11+
- Docker + Docker Compose (easiest), or local Postgres 16 + Redis 7

### Quick start (Docker)

```bash
cp .env.example .env          # fill in API keys (works with empty keys in paper mode)
docker compose up --build     # starts postgres, redis, api, worker

# In another terminal — run migrations + seed:
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

API is now at **http://localhost:8000** · docs at **/docs**.

### Quick start (no Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Start Postgres + Redis however you like, then:
cp .env.example .env          # set DATABASE_URL + REDIS_URL
alembic upgrade head
python -m scripts.seed

# Terminal 1 — API:
uvicorn app.main:app --reload

# Terminal 2 — workers:
arq app.workers.settings.WorkerSettings
```

---

## Paper mode vs live trading

The backend runs in **paper-trading mode by default** — positions are simulated in the DB,
no real funds move. This requires zero API keys beyond the database.

To enable **live trading** on Polymarket, set in `.env`:
- `POLYMARKET_PRIVATE_KEY` — the signer key for your proxy wallet
- `POLYMARKET_FUNDER` — your Polymarket proxy address

Signals still generate without AI keys (they just won't have LLM reasoning).
To enable real AI reasoning, set `ANTHROPIC_API_KEY`.

### Cost-aware design
- `generate_signals` only runs the LLM on the **top 25 markets by volume** (tunable)
- cheap heuristics (`app/ai/scoring.py`) score the firehose; the LLM only sees aggregates
- Twitter scanning is rate-limit aware and batched

---

## Deploy to Railway

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Add plugins: **PostgreSQL** and **Redis** (Railway injects `DATABASE_URL`, `REDIS_URL`).
4. Create **two services** from the same repo:
   - **api** — start command:
     `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **worker** — start command:
     `arq app.workers.settings.WorkerSettings`
5. In each service's **Variables**, set the secrets from `.env.example`
   (`SECRET_KEY`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, etc).
6. Deploy. Seed once via Railway shell: `python -m scripts.seed`.

`railway.toml` already configures the Dockerfile build + healthcheck.

> Note: `DATABASE_URL` from Railway uses the `postgresql://` scheme.
> This app needs the async driver. Either set `DATABASE_URL` to start with
> `postgresql+asyncpg://`, or add a tiny shim. Railway lets you reference the
> plugin var: set `DATABASE_URL=${{Postgres.DATABASE_URL}}` then override the
> scheme, or use a `DATABASE_URL` variable that includes `+asyncpg`.

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/phantom/nonce` | Get nonce to sign |
| POST | `/api/v1/auth/phantom/verify` | Verify signature → JWT |
| POST | `/api/v1/auth/google/verify` | Verify Google token → JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user |
| GET | `/api/v1/markets` | List markets |
| GET | `/api/v1/markets/{id}` | Market detail |
| GET | `/api/v1/markets/{id}/history` | Price history |
| GET | `/api/v1/signals` | List active signals (filterable) |
| GET | `/api/v1/signals/{id}` | Signal detail |
| WS | `/api/v1/signals/stream` | **Live signal stream** |
| GET/POST | `/api/v1/bots` | List / create bots |
| GET/PATCH/DELETE | `/api/v1/bots/{id}` | Manage a bot |
| GET/POST | `/api/v1/positions` | List / open positions |
| POST | `/api/v1/positions/{id}/close` | Close a position |
| GET | `/api/v1/whales` | Top whales |
| GET | `/api/v1/whales/recent` | Recent whale positions |
| GET | `/api/v1/whales/flow` | Aggregate 24h flow |
| GET | `/health` `/ready` | Health checks |

Auth: send `Authorization: Bearer <access_token>` on protected routes.

---

## Auth flow (Phantom)

```
1. Frontend → POST /auth/phantom/nonce { address }
2. Backend  → { nonce, message }
3. Frontend → wallet.signMessage(message)  // user approves in Phantom
4. Frontend → POST /auth/phantom/verify { address, signature, nonce }
5. Backend  → { access_token, refresh_token }
```

The message is human-readable, costs no gas, and the nonce is single-use
(stored in Redis with a 5-minute TTL, deleted on success).

---

## Testing

```bash
pytest                  # smoke tests (no external deps needed)
ruff check app          # lint
mypy app                # type-check
```

---

## What's stubbed (next steps)

These are scaffolded but need real wiring before production:

- **Onchain whale tracking** (`integrations/onchain.py`) — subscribe to Polygon CTF
  Transfer events via Alchemy webhooks or The Graph subgraph; upsert into `whale_positions`.
- **Telegram ingestion** — Telethon session setup (needs phone auth once).
- **Embedding dedup** — `ai/embeddings.py` is ready; wire a pgvector column or external
  vector store to dedup near-identical events before they reach the LLM.
- **Kalshi integration** — add a `integrations/kalshi.py` mirroring the Polymarket client
  for cross-market arbitrage signals.
- **Bot PnL rollups** — a periodic task to recompute `bots.pnl_24h_pct` / `win_rate`
  from closed positions.

---

## License

Proprietary — © 2026 Polymind.
