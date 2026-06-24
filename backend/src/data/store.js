// In-memory data store. Mirrors the PostgreSQL schema (see sql/schema.sql)
// but keeps everything in process so the app runs with no external services.

import { generateSeed } from './seed.js';
import { MODELS, AGENTS, TEAMS } from './catalog.js';
import { config } from '../config.js';
import { bus, EVENTS } from '../services/events.js';
import { computeAlerts } from '../services/alerting.js';
import { buildRecommendations } from '../services/recommendation.js';
import { db } from './db.js';
import {
  ensureSchema, isSeeded, seedDatabase, loadAll,
  insertEntity, saveConfig, insertAudit, insertRun,
} from './persistence.js';
import { analyzeCode } from '../services/codeAnalysis.js';
import { evaluateRun } from '../services/evaluation.js';
import { TASK_TYPES } from '../config.js';

// Config subset that is persisted (governance only — never the runtime port).
function configForPersist(c) {
  const { port, ...rest } = c;
  return rest;
}

class Store {
  constructor() {
    // Always generate the in-memory seed in the constructor. It is both the
    // default working set (in-memory mode) and the source data used to seed
    // PostgreSQL on first run. Set SEED_RUNS=0 to start empty and ingest only
    // real runs via POST /api/runs.
    const runCount = process.env.SEED_RUNS != null ? Number(process.env.SEED_RUNS) : 1200;
    const seed = generateSeed(1337, Number.isFinite(runCount) ? runCount : 1200);
    this.teams = [...TEAMS];
    this.models = MODELS.map((m) => ({ ...m, active: true }));
    this.agents = AGENTS.map((a) => ({ ...a, active: true }));
    this.users = seed.users;
    this.runs = seed.runs;
    this.incidents = seed.incidents;
    this.auditLog = seed.auditLog;
    this.alerts = computeAlerts(this.runs);
    this.config = config;
    this.startedAt = Date.now();
    this.persistent = false;
    this.mode = 'in-memory';
  }

  // Connect to PostgreSQL when configured: apply schema, seed on first run,
  // then hydrate the in-memory working set from the database. Falls back to
  // the in-memory seed if the database is unavailable.
  async init() {
    if (!db.isEnabled()) {
      this.mode = 'in-memory';
      return this;
    }
    try {
      await db.connect();
      await ensureSchema();
      if (!(await isSeeded())) {
        await seedDatabase({
          teams: this.teams, models: this.models, agents: this.agents,
          users: this.users, runs: this.runs, incidents: this.incidents,
          auditLog: this.auditLog, config: configForPersist(this.config),
        });
      }
      const data = await loadAll();
      this.teams = data.teams;
      this.agents = data.agents;
      this.models = data.models;
      this.users = data.users;
      this.runs = data.runs;
      this.incidents = data.incidents;
      this.auditLog = data.auditLog;
      if (data.config) deepMerge(this.config, data.config);
      this.persistent = true;
      this.mode = 'postgres';
      this.refreshAlerts();
    } catch (err) {
      // Degrade gracefully: keep the in-memory seed already generated.
      this.persistent = false;
      this.mode = 'in-memory (database unavailable)';
      this.dbError = err.message;
    }
    return this;
  }

  // ---- lookups -----------------------------------------------------
  agentById(id) { return this.agents.find((a) => a.id === id); }
  modelById(id) { return this.models.find((m) => m.id === id); }
  userById(id) { return this.users.find((u) => u.id === id); }
  teamById(id) { return this.teams.find((t) => t.id === id); }

  // Enrich a run with human-readable joined fields.
  enrich(run) {
    return {
      ...run,
      agentName: this.agentById(run.agentId)?.name ?? run.agentId,
      modelName: this.modelById(run.modelId)?.name ?? run.modelId,
      provider: this.modelById(run.modelId)?.provider ?? 'Unknown',
      userName: this.userById(run.userId)?.name ?? run.userId,
      teamName: this.teamById(run.teamId)?.name ?? run.teamId,
    };
  }

  // ---- audit (in-memory; DB write handled by the async mutators) ---
  audit(actor, action, target, meta = {}) {
    const entry = { id: `audit_${this.auditLog.length + 1}`, actor, action, target, meta, at: new Date().toISOString() };
    this.auditLog.unshift(entry);
    return entry;
  }

  // ---- mutations (admin), write-through to PostgreSQL when persistent ----
  async addEntity(kind, payload, actor = 'admin') {
    const id = `${kind.slice(0, 3)}_${Date.now().toString(36)}`;
    const record = { id, ...payload, active: true };
    const target = { agents: this.agents, models: this.models, teams: this.teams, users: this.users }[kind];
    if (!target) throw new Error(`Unknown entity kind: ${kind}`);
    target.push(record);
    const entry = this.audit(actor, `${kind}.create`, id, payload);
    if (this.persistent) {
      await insertEntity(kind, record);
      await insertAudit(entry);
    }
    bus.publish(EVENTS.CONFIG_CHANGED, { kind, id });
    return record;
  }

  async updateConfig(patch, actor = 'admin') {
    deepMerge(this.config, patch);
    const entry = this.audit(actor, 'config.update', 'thresholds', patch);
    if (this.persistent) {
      await saveConfig(configForPersist(this.config));
      await insertAudit(entry);
    }
    bus.publish(EVENTS.CONFIG_CHANGED, { patch });
    this.refreshAlerts();
    return this.config;
  }

  // ---- ingestion: score and store a real run -----------------------
  async ingestRun(input = {}) {
    const agent = this.agentById(input.agentId) || this.agents.find((a) => a.name === input.agentName);
    if (!agent) throw httpError(400, `Unknown agent. Provide a valid agentId or agentName. Known: ${this.agents.map((a) => a.name).join(', ')}`);

    const model =
      this.modelById(input.modelId) ||
      this.models.find((m) => m.name === input.modelName) ||
      this.models.find((m) => m.provider === input.provider);
    if (!model) throw httpError(400, `Unknown model. Provide a valid modelId, modelName or provider. Known: ${this.models.map((m) => m.name).join(', ')}`);

    const user = this.userById(input.userId) || this.users.find((u) => u.email === input.userEmail) || this.users[0];
    const taskType = TASK_TYPES.includes(input.taskType) ? input.taskType : 'Code Generation';

    // Real evaluation: analyze submitted code (or use explicit signals).
    const code = String(input.code || '');
    const signals = input.signals && typeof input.signals === 'object'
      ? { ...analyzeCode(code, { testCoverage: input.testCoverage }), ...input.signals }
      : analyzeCode(code, { testCoverage: input.testCoverage });
    const metrics = evaluateRun(signals);

    // Tokens & cost: use provided values, else estimate from code size.
    const promptTokens = num(input.promptTokens, Math.max(200, Math.round(code.length / 3)));
    const completionTokens = num(input.completionTokens, Math.max(150, Math.round(code.length / 4)));
    const tokensUsed = num(input.tokensUsed, promptTokens + completionTokens);
    const costUsd = input.costUsd != null
      ? Number(Number(input.costUsd).toFixed(4))
      : Number(((tokensUsed / 1000) * (model.pricePer1k || 0.006)).toFixed(4));
    const durationMs = num(input.durationMs, model.baseLatencyMs || 4500);

    // Status: explicit, else derived from the computed health score.
    const allowedStatus = ['Success', 'Partial Success', 'Failed'];
    let status = allowedStatus.includes(input.status) ? input.status : null;
    if (!status) status = metrics.healthScore >= 75 ? 'Success' : metrics.healthScore >= 55 ? 'Partial Success' : 'Failed';

    const now = new Date();
    const run = {
      id: input.id || `run_${now.getTime().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      agentId: agent.id,
      modelId: model.id,
      userId: user.id,
      teamId: user.teamId,
      taskType,
      status,
      promptSummary: input.promptSummary || (code ? `Ingested ${taskType.toLowerCase()} run (${signals.loc} LOC analyzed)` : `Ingested ${taskType.toLowerCase()} run`),
      promptTokens,
      completionTokens,
      tokensUsed,
      costUsd,
      durationMs,
      filesChanged: Array.isArray(input.files) ? input.files : [],
      codeSnippet: code.slice(0, 1500),
      metrics,
      failureReason: status === 'Failed' ? (input.failureReason || 'Failed evaluation quality gate') : null,
      retries: num(input.retries, 0),
      logs: [
        { ts: 0, level: 'info', message: `[ingest] received run from ${agent.name} (${model.name})` },
        { ts: 1, level: 'info', message: `[analyze] ${signals.loc} LOC, complexity ${signals.complexity}, ${signals.hardcodedSecrets} secret(s), ${signals.sqlInjection} sqli, ${signals.unsafeEval} eval` },
        { ts: 2, level: status === 'Failed' ? 'error' : 'info', message: `[score] health ${metrics.healthScore} → ${status}` },
      ],
      timestamp: now.toISOString(),
      traceId: `trc_${Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')}`,
    };

    this.runs.unshift(run);
    if (this.persistent) await insertRun(run);
    this.refreshAlerts();
    bus.publish(EVENTS.RUN_INGESTED, { id: run.id, status });
    return this.enrich(run);
  }

  refreshAlerts() {
    this.alerts = computeAlerts(this.runs);
    return this.alerts;
  }

  recommendations() {
    return buildRecommendations(this.runs, this.models);
  }
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deepMerge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = target[k] || {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

// ---- generic query helpers (pagination / filter / sort) ------------
export function queryRuns(runs, params) {
  let result = runs;
  const {
    search, status, agentId, modelId, teamId, taskType, provider,
    sort = 'timestamp', dir = 'desc', page = 1, size = 25,
  } = params;

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.promptSummary.toLowerCase().includes(q) ||
      r.taskType.toLowerCase().includes(q) ||
      (r.userName || '').toLowerCase().includes(q) ||
      (r.agentName || '').toLowerCase().includes(q) ||
      (r.modelName || '').toLowerCase().includes(q)
    );
  }
  if (status) result = result.filter((r) => r.status === status);
  if (agentId) result = result.filter((r) => r.agentId === agentId);
  if (modelId) result = result.filter((r) => r.modelId === modelId);
  if (teamId) result = result.filter((r) => r.teamId === teamId);
  if (taskType) result = result.filter((r) => r.taskType === taskType);
  if (provider) result = result.filter((r) => r.provider === provider);

  const dirMul = dir === 'asc' ? 1 : -1;
  result = [...result].sort((a, b) => {
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    if (av < bv) return -1 * dirMul;
    if (av > bv) return 1 * dirMul;
    return 0;
  });

  const total = result.length;
  const pageNum = Math.max(1, Number(page));
  const pageSize = Math.max(1, Math.min(200, Number(size)));
  const start = (pageNum - 1) * pageSize;
  const data = result.slice(start, start + pageSize);

  return { data, total, page: pageNum, size: pageSize, totalPages: Math.ceil(total / pageSize) };
}

function sortValue(run, key) {
  switch (key) {
    case 'cost': return run.costUsd;
    case 'duration': return run.durationMs;
    case 'tokens': return run.tokensUsed;
    case 'health': return run.metrics.healthScore;
    case 'timestamp': return new Date(run.timestamp).getTime();
    default: return run[key] ?? '';
  }
}

export const store = new Store();
