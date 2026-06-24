// Persistence layer: bridges the in-memory working set to PostgreSQL.
//
// Strategy (read-through working set):
//   - On startup, apply the schema (idempotent), seed the DB on first run,
//     then load all rows into the in-memory arrays the analytics layer reads.
//   - Mutations write through to PostgreSQL AND update the in-memory arrays,
//     so reads stay fast and data survives restarts.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { db } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '..', '..', 'sql', 'schema.sql');

export async function ensureSchema() {
  const sql = await readFile(SCHEMA_PATH, 'utf8');
  await db.query(sql);
}

export async function isSeeded() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM agent_runs');
  return rows[0].n > 0;
}

// Chunked multi-row INSERT helper.
async function bulkInsert(client, table, columns, rows, conflict = '') {
  if (rows.length === 0) return;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = [];
    const tuples = slice.map((row, r) => {
      const ph = columns.map((_, c) => `$${r * columns.length + c + 1}`);
      values.push(...row);
      return `(${ph.join(',')})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${tuples.join(',')} ${conflict}`,
      values
    );
  }
}

// Persist a freshly generated seed (catalog + generated data) into PostgreSQL.
export async function seedDatabase({ teams, models, agents, users, runs, incidents, auditLog, config }) {
  await db.transaction(async (client) => {
    await bulkInsert(client, 'teams', ['id', 'name'], teams.map((t) => [t.id, t.name]), 'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'agents', ['id', 'name', 'vendor', 'active'],
      agents.map((a) => [a.id, a.name, a.vendor, a.active ?? true]), 'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'models', ['id', 'provider', 'name', 'tier', 'price_per_1k', 'active'],
      models.map((m) => [m.id, m.provider, m.name, m.tier, m.pricePer1k, m.active ?? true]), 'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'users', ['id', 'name', 'email', 'team_id', 'role'],
      users.map((u) => [u.id, u.name, u.email, u.teamId, u.role]), 'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'agent_runs',
      ['id', 'agent_id', 'model_id', 'user_id', 'team_id', 'task_type', 'status', 'prompt_summary',
        'prompt_tokens', 'completion_tokens', 'tokens_used', 'cost_usd', 'duration_ms', 'files_changed',
        'code_snippet', 'logs', 'failure_reason', 'retries', 'trace_id', 'created_at'],
      runs.map((r) => [
        r.id, r.agentId, r.modelId, r.userId, r.teamId, r.taskType, r.status, r.promptSummary,
        r.promptTokens, r.completionTokens, r.tokensUsed, r.costUsd, r.durationMs,
        JSON.stringify(r.filesChanged), r.codeSnippet, JSON.stringify(r.logs), r.failureReason,
        r.retries, r.traceId, r.timestamp,
      ]), 'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'run_metrics',
      ['run_id', 'quality_score', 'security_score', 'maintainability_score', 'test_coverage_score', 'health_score', 'findings'],
      runs.map((r) => [
        r.id, r.metrics.qualityScore, r.metrics.securityScore, r.metrics.maintainabilityScore,
        r.metrics.testCoverageScore, r.metrics.healthScore,
        JSON.stringify({ security: r.metrics.securityFindings || [], maintainability: r.metrics.maintainabilityFindings || [] }),
      ]), 'ON CONFLICT (run_id) DO NOTHING');

    await bulkInsert(client, 'incidents',
      ['id', 'title', 'severity', 'status', 'started_at', 'resolved_at', 'affected_agent', 'impacted_runs', 'summary'],
      incidents.map((i) => [i.id, i.title, i.severity, i.status, i.startedAt, i.resolvedAt, i.affectedAgent, i.impactedRuns, i.summary]),
      'ON CONFLICT (id) DO NOTHING');

    await bulkInsert(client, 'audit_log', ['actor', 'action', 'target', 'meta'],
      auditLog.map((a) => [a.actor, a.action, a.target, JSON.stringify(a.meta || {})]));

    await client.query(
      `INSERT INTO settings (key, value) VALUES ('runtime', $1)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(config)]
    );
  });
}

// Load everything back into the shapes the in-memory store/analytics expect.
export async function loadAll() {
  const [teams, agents, models, users, runs, incidents, audit, settings] = await Promise.all([
    db.query('SELECT * FROM teams'),
    db.query('SELECT * FROM agents'),
    db.query('SELECT * FROM models'),
    db.query('SELECT * FROM users'),
    db.query(`
      SELECT r.*, m.quality_score, m.security_score, m.maintainability_score,
             m.test_coverage_score, m.health_score, m.findings
      FROM agent_runs r
      LEFT JOIN run_metrics m ON m.run_id = r.id
      ORDER BY r.created_at DESC`),
    db.query('SELECT * FROM incidents ORDER BY started_at DESC'),
    db.query('SELECT * FROM audit_log ORDER BY at DESC LIMIT 200'),
    db.query("SELECT value FROM settings WHERE key = 'runtime'"),
  ]);

  return {
    teams: teams.rows.map((t) => ({ id: t.id, name: t.name })),
    agents: agents.rows.map((a) => ({ id: a.id, name: a.name, vendor: a.vendor, active: a.active })),
    models: models.rows.map((m) => ({ id: m.id, provider: m.provider, name: m.name, tier: m.tier, pricePer1k: m.price_per_1k, active: m.active })),
    users: users.rows.map((u) => ({ id: u.id, name: u.name, email: u.email, teamId: u.team_id, role: u.role })),
    runs: runs.rows.map(rowToRun),
    incidents: incidents.rows.map((i) => ({
      id: i.id, title: i.title, severity: i.severity, status: i.status,
      startedAt: i.started_at?.toISOString?.() ?? i.started_at,
      resolvedAt: i.resolved_at?.toISOString?.() ?? i.resolved_at,
      affectedAgent: i.affected_agent, impactedRuns: i.impacted_runs, summary: i.summary,
    })),
    auditLog: audit.rows.map((a) => ({ id: `audit_${a.id}`, actor: a.actor, action: a.action, target: a.target, meta: a.meta, at: a.at?.toISOString?.() ?? a.at })),
    config: settings.rows[0]?.value ?? null,
  };
}

function rowToRun(r) {
  const findings = r.findings || {};
  return {
    id: r.id,
    agentId: r.agent_id,
    modelId: r.model_id,
    userId: r.user_id,
    teamId: r.team_id,
    taskType: r.task_type,
    status: r.status,
    promptSummary: r.prompt_summary,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    tokensUsed: r.tokens_used,
    costUsd: r.cost_usd,
    durationMs: r.duration_ms,
    filesChanged: r.files_changed || [],
    codeSnippet: r.code_snippet,
    logs: r.logs || [],
    failureReason: r.failure_reason,
    retries: r.retries,
    traceId: r.trace_id,
    timestamp: r.created_at?.toISOString?.() ?? r.created_at,
    metrics: {
      qualityScore: r.quality_score,
      securityScore: r.security_score,
      securityFindings: findings.security || [],
      maintainabilityScore: r.maintainability_score,
      maintainabilityFindings: findings.maintainability || [],
      testCoverageScore: r.test_coverage_score,
      healthScore: r.health_score,
    },
  };
}

// ---- write-through helpers for admin mutations ----------------------
export async function insertEntity(kind, record) {
  switch (kind) {
    case 'agents':
      return db.query('INSERT INTO agents (id, name, vendor, active) VALUES ($1,$2,$3,$4)',
        [record.id, record.name, record.vendor ?? 'Unknown', record.active ?? true]);
    case 'models':
      return db.query('INSERT INTO models (id, provider, name, tier, price_per_1k, active) VALUES ($1,$2,$3,$4,$5,$6)',
        [record.id, record.provider ?? 'Unknown', record.name, record.tier ?? 'balanced', record.pricePer1k ?? 0, record.active ?? true]);
    case 'teams':
      return db.query('INSERT INTO teams (id, name) VALUES ($1,$2)', [record.id, record.name]);
    case 'users':
      return db.query('INSERT INTO users (id, name, email, team_id, role) VALUES ($1,$2,$3,$4,$5)',
        [record.id, record.name, record.email, record.teamId, record.role ?? 'viewer']);
    default:
      throw new Error(`Unknown entity kind: ${kind}`);
  }
}

// Persist a single ingested run (agent_runs + run_metrics) in one transaction.
export async function insertRun(run) {
  return db.transaction(async (client) => {
    await client.query(
      `INSERT INTO agent_runs
        (id, agent_id, model_id, user_id, team_id, task_type, status, prompt_summary,
         prompt_tokens, completion_tokens, tokens_used, cost_usd, duration_ms, files_changed,
         code_snippet, logs, failure_reason, retries, trace_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        run.id, run.agentId, run.modelId, run.userId, run.teamId, run.taskType, run.status,
        run.promptSummary, run.promptTokens, run.completionTokens, run.tokensUsed, run.costUsd,
        run.durationMs, JSON.stringify(run.filesChanged), run.codeSnippet, JSON.stringify(run.logs),
        run.failureReason, run.retries, run.traceId, run.timestamp,
      ]
    );
    await client.query(
      `INSERT INTO run_metrics
        (run_id, quality_score, security_score, maintainability_score, test_coverage_score, health_score, findings)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        run.id, run.metrics.qualityScore, run.metrics.securityScore, run.metrics.maintainabilityScore,
        run.metrics.testCoverageScore, run.metrics.healthScore,
        JSON.stringify({ security: run.metrics.securityFindings || [], maintainability: run.metrics.maintainabilityFindings || [] }),
      ]
    );
  });
}

export async function saveConfig(config) {
  return db.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('runtime', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(config)]
  );
}

export async function insertAudit(entry) {
  return db.query('INSERT INTO audit_log (actor, action, target, meta) VALUES ($1,$2,$3,$4)',
    [entry.actor, entry.action, entry.target, JSON.stringify(entry.meta || {})]);
}
