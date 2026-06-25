# AgentOps Control Center

A production-style full-stack platform for **monitoring, evaluating, and governing AI coding agents**
(Claude Code, Cursor, GitHub Copilot, OpenAI Codex, and internal agents).

It looks and behaves like a modern SaaS platform used by engineering leadership: executive
dashboards, an AI evaluation engine, SLO/reliability tracking, model comparison, a recommendation
engine, alerting, and an admin console.

> The application is **fully usable with zero external integrations**. The backend ships with an
> in-memory data layer that is seeded at startup with 1,000+ realistic agent runs.
>
> It **also supports real PostgreSQL persistence** — set `DATABASE_URL` and the backend applies
> the schema, seeds the database on first run, and thereafter loads from (and writes through to)
> Postgres so data survives restarts. Without `DATABASE_URL` it transparently falls back to the
> in-memory store. See [Optional: PostgreSQL persistence](#optional-postgresql-persistence).

---

## Architecture

```
agentops-control-center/
├── backend/                 # Node.js + Express REST API + event-driven processing
│   ├── src/
│   │   ├── server.js        # App entrypoint, middleware wiring
│   │   ├── config.js        # SLO/cost/alert thresholds, weights
│   │   ├── data/            # In-memory store + deterministic seed generator
│   │   ├── services/        # Evaluation, recommendation, alerting, events
│   │   ├── middleware/      # Tracing, structured logging, RBAC, cache
│   │   └── routes/          # REST endpoints (dashboard, runs, reliability, ...)
│   └── sql/schema.sql       # PostgreSQL production schema
└── frontend/                # Next.js (App Router) + React + TypeScript + Tailwind + Recharts
    └── app/                 # Dashboard, Runs, Run Details, Reliability, Models, Admin, Alerts, Status, Docs
```

check Live here:
https://agentops-frontend.onrender.com/

**Technology**

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Recharts
- Backend: Node.js, Express, in-memory store (PostgreSQL schema provided)
- Patterns: REST API, event-driven processing layer, modular backend services

---

## Quick start

You need **Node.js 18+**. Open two terminals.

### 1. Backend

```bash
cd backend
npm install
npm start
# API on http://localhost:4000
```

Verify:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/metrics
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# UI on http://localhost:3000
```

The frontend talks to the backend via `NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:4000`).

---

## Optional: PostgreSQL persistence

By default the backend runs entirely in memory (no database needed). To persist data across
restarts, point it at a PostgreSQL instance. A ready-to-use one is provided via Docker:

```bash
# from the repo root — starts Postgres 16 on localhost:5433
docker compose up -d

# then run the backend with the connection string
cd backend
cp .env.example .env        # contains the matching DATABASE_URL
npm start
```

On first start the backend will:
1. apply `backend/sql/schema.sql` (idempotent — `CREATE TABLE/INDEX IF NOT EXISTS`),
2. seed the database with the generated 1,200 runs + catalog,
3. load everything into its in-memory working set for fast analytics.

On subsequent starts it loads existing data instead of re-seeding. Admin actions
(create agent/model/team/user, threshold changes) **write through** to Postgres, so they
survive restarts. If `DATABASE_URL` is unset or the database is unreachable, the backend logs a
warning and falls back to the in-memory store — the app keeps working either way.

Verify which mode is active:

```bash
curl http://localhost:4000/api/health    # -> "storage": "postgres" | "in-memory", "persistent": true|false
```

To stop and wipe the database: `docker compose down -v`.

---

## Senior-level touches included

- Caching layer simulation (`X-Cache: HIT/MISS`) with TTL
- Audit logs for every mutating admin action
- Pagination, filtering, sorting on the runs API
- Role-based access control middleware (`x-role` header)
- API documentation page (`/docs`) + machine-readable `/api/docs`
- Health check endpoint (`/api/health`) and Prometheus-style metrics (`/api/metrics`)
- Structured JSON logging with request tracing IDs (`x-trace-id`)
- System status page driven by live component health

See `backend/API.md` for the full endpoint reference.
