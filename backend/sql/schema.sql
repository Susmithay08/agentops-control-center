-- AgentOps Control Center — PostgreSQL production schema
-- Applied automatically by the backend at startup when DATABASE_URL is set
-- (idempotent: CREATE TABLE/INDEX IF NOT EXISTS). Without DATABASE_URL the
-- backend falls back to an in-memory store seeded with the same data.

CREATE TABLE IF NOT EXISTS teams (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    team_id     TEXT NOT NULL REFERENCES teams(id),
    role        TEXT NOT NULL CHECK (role IN ('admin','manager','engineer','viewer')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    vendor       TEXT NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
    id            TEXT PRIMARY KEY,
    provider      TEXT NOT NULL,             -- Claude | GPT | Gemini | Copilot
    name          TEXT NOT NULL,
    tier          TEXT NOT NULL,             -- frontier | balanced | fast
    price_per_1k  NUMERIC(10,5) NOT NULL,    -- USD per 1K tokens
    active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id                TEXT PRIMARY KEY,
    agent_id          TEXT NOT NULL REFERENCES agents(id),
    model_id          TEXT NOT NULL REFERENCES models(id),
    user_id           TEXT NOT NULL REFERENCES users(id),
    team_id           TEXT NOT NULL REFERENCES teams(id),
    task_type         TEXT NOT NULL,         -- Code Generation | Code Review | ...
    status            TEXT NOT NULL CHECK (status IN ('Success','Partial Success','Failed')),
    prompt_summary    TEXT,
    prompt_tokens     INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    tokens_used       INTEGER NOT NULL,
    cost_usd          NUMERIC(12,4) NOT NULL,
    duration_ms       INTEGER NOT NULL,
    files_changed     JSONB NOT NULL DEFAULT '[]',
    code_snippet      TEXT,
    logs              JSONB NOT NULL DEFAULT '[]',
    failure_reason    TEXT,
    retries           INTEGER NOT NULL DEFAULT 0,
    trace_id          TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_created    ON agent_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_agent      ON agent_runs (agent_id);
CREATE INDEX IF NOT EXISTS idx_runs_model      ON agent_runs (model_id);
CREATE INDEX IF NOT EXISTS idx_runs_status     ON agent_runs (status);
CREATE INDEX IF NOT EXISTS idx_runs_task_type  ON agent_runs (task_type);

-- One-to-one evaluation metrics per run (AI Evaluation Engine output).
CREATE TABLE IF NOT EXISTS run_metrics (
    run_id                 TEXT PRIMARY KEY REFERENCES agent_runs(id) ON DELETE CASCADE,
    quality_score          SMALLINT NOT NULL,
    security_score         SMALLINT NOT NULL,
    maintainability_score  SMALLINT NOT NULL,
    test_coverage_score    SMALLINT NOT NULL,
    health_score           SMALLINT NOT NULL,
    findings               JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS alerts (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,               -- cost | reliability | slo | latency
    severity    TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    context     JSONB NOT NULL DEFAULT '{}',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    severity      TEXT NOT NULL,             -- SEV1 | SEV2 | SEV3
    status        TEXT NOT NULL,             -- investigating | resolved
    started_at    TIMESTAMPTZ NOT NULL,
    resolved_at   TIMESTAMPTZ,
    affected_agent TEXT,
    impacted_runs INTEGER NOT NULL DEFAULT 0,
    summary       TEXT
);

CREATE TABLE IF NOT EXISTS recommendations (
    id            BIGSERIAL PRIMARY KEY,
    task_type     TEXT NOT NULL,
    recommended   TEXT NOT NULL,             -- provider
    score         NUMERIC(6,2) NOT NULL,
    explanation   TEXT NOT NULL,
    weights       JSONB NOT NULL,
    generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    target      TEXT,
    meta        JSONB NOT NULL DEFAULT '{}',
    at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton key/value store for runtime configuration (SLO/cost/alert
-- thresholds, recommendation weights). Persists Admin → Configuration edits.
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
