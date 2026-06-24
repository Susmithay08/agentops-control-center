// Deterministic seed generator. Produces teams, users, agents, models,
// 1000+ agent runs (with evaluated metrics), incidents and audit entries.

import { createRng } from '../util/rng.js';
import { evaluateRun } from '../services/evaluation.js';
import {
  MODELS, AGENTS, AGENT_MODELS, TEAMS, FIRST_NAMES, LAST_NAMES,
  PROMPT_TEMPLATES, FILE_POOL, FAILURE_REASONS,
} from './catalog.js';

const TASK_TYPES = ['Code Generation', 'Code Review', 'Test Generation', 'Refactoring', 'Documentation'];

const CODE_SNIPPETS = {
  'Code Generation': `export async function listOrders(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(100, Number(req.query.size) || 20);
  const { rows, total } = await orders.paginate({ page, size });
  res.json({ data: rows, page, size, total });
}`,
  'Code Review': `// Findings:
// - line 42: token compared with == (timing-unsafe); use crypto.timingSafeEqual
// - line 58: missing rate limit on /login
// + good: input is validated with zod schema before use`,
  'Test Generation': `describe('invoice totals', () => {
  it('applies tax after discounts', () => {
    const total = computeTotal({ subtotal: 100, discount: 0.1, taxRate: 0.2 });
    expect(total).toBeCloseTo(108);
  });
});`,
  Refactoring: `// before: nested callbacks
// after:
async function loadUser(id) {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError(id);
  return decorate(user);
}`,
  Documentation: `/**
 * Charges a customer for an invoice.
 * @param {string} customerId - Stripe customer id
 * @param {number} amountCents - amount in the smallest currency unit
 * @returns {Promise<Charge>}
 */`,
};

function buildUsers(rng) {
  const users = [];
  let idx = 0;
  for (const team of TEAMS) {
    const count = rng.int(4, 7);
    for (let i = 0; i < count; i++) {
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      idx++;
      users.push({
        id: `usr_${idx}`,
        name: `${first} ${last}`,
        // idx keeps emails unique even when names collide (DB UNIQUE constraint).
        email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}${idx}@acme.dev`,
        teamId: team.id,
        role: i === 0 ? 'manager' : rng.weighted([
          { value: 'engineer', weight: 8 }, { value: 'viewer', weight: 2 },
        ]),
      });
    }
  }
  // Ensure one platform admin.
  users.push({ id: 'usr_admin', name: 'Riley Admin', email: 'riley.admin@acme.dev', teamId: 'team_platform', role: 'admin' });
  return users;
}

function makeSignals(rng, model, agent, taskType) {
  // Build static-analysis-style signals; better models/agents skew cleaner.
  const qualityFloor = (model.qualityBias + agent.reliabilityBias * 20) / 2;
  const sloppy = rng.float(0, 1) > 0.6 + qualityFloor / 40;

  return {
    complexity: rng.int(4, sloppy ? 22 : 14),
    testCoverage: rng.int(taskType === 'Test Generation' ? 60 : 30, taskType === 'Test Generation' ? 98 : 92),
    hardcodedSecrets: rng.bool(sloppy ? 0.18 : 0.04) ? rng.int(1, 2) : 0,
    sqlInjection: rng.bool(sloppy ? 0.12 : 0.02) ? 1 : 0,
    unsafeEval: rng.bool(sloppy ? 0.1 : 0.02) ? 1 : 0,
    missingValidation: rng.bool(sloppy ? 0.4 : 0.15) ? rng.int(1, 3) : 0,
    avgFunctionLength: rng.int(18, sloppy ? 75 : 45),
    duplicationRatio: rng.float(0, sloppy ? 0.25 : 0.09),
    namingQuality: rng.float(sloppy ? 0.55 : 0.78, 0.98),
  };
}

export function generateSeed(seed = 1337, runCount = 1200) {
  const rng = createRng(seed);
  const users = buildUsers(rng);
  const runs = [];
  const incidents = [];
  const auditLog = [];

  const now = Date.now();
  const horizonDays = 30;

  for (let i = 0; i < runCount; i++) {
    const agent = rng.pick(AGENTS);
    const modelId = rng.pick(AGENT_MODELS[agent.id]);
    const model = MODELS.find((m) => m.id === modelId);
    const user = rng.pick(users);
    const taskType = rng.pick(TASK_TYPES);

    // Timestamp weighted toward recent days.
    const daysAgo = Math.floor(Math.pow(rng.next(), 1.5) * horizonDays);
    const ts = now - daysAgo * 86400000 - rng.int(0, 86400000);

    const signals = makeSignals(rng, model, agent, taskType);
    const metrics = evaluateRun(signals);

    // Status correlates with health score + agent reliability. Tuned so a
    // healthy platform shows ~85% success / ~9% partial / ~6% failed.
    const reliabilityRoll = rng.next() + agent.reliabilityBias + (metrics.healthScore - 75) / 260;
    let status;
    if (reliabilityRoll < 0.08) status = 'Failed';
    else if (reliabilityRoll < 0.2) status = 'Partial Success';
    else status = 'Success';

    const promptTokens = rng.int(1500, 9000);
    const completionTokens = rng.int(800, 7000);
    const tokensUsed = promptTokens + completionTokens;
    const costUsd = Number(((tokensUsed / 1000) * model.pricePer1k * rng.float(0.9, 1.2)).toFixed(4));
    const durationMs = Math.round(model.baseLatencyMs * rng.float(0.6, 1.9) + (status === 'Failed' ? rng.int(2000, 9000) : 0));

    const filesChanged = Array.from(
      { length: rng.int(1, 6) },
      () => rng.pick(FILE_POOL)
    ).filter((v, idx, arr) => arr.indexOf(v) === idx);

    const run = {
      id: `run_${(100000 + i).toString(36)}`,
      agentId: agent.id,
      modelId: model.id,
      userId: user.id,
      teamId: user.teamId,
      taskType,
      status,
      promptSummary: rng.pick(PROMPT_TEMPLATES[taskType]),
      promptTokens,
      completionTokens,
      tokensUsed,
      costUsd,
      durationMs,
      filesChanged,
      codeSnippet: CODE_SNIPPETS[taskType],
      metrics,
      failureReason: status === 'Failed' ? rng.pick(FAILURE_REASONS) : null,
      retries: status === 'Failed' ? rng.int(0, 3) : rng.bool(0.15) ? 1 : 0,
      logs: buildLogs(rng, status, agent, model, durationMs),
      timestamp: new Date(ts).toISOString(),
      traceId: `trc_${(rng.int(0, 0xffffffff) >>> 0).toString(16).padStart(8, '0')}`,
    };
    runs.push(run);
  }

  runs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Synthesize incidents from clusters of failures.
  const failed = runs.filter((r) => r.status === 'Failed');
  for (let i = 0; i < 6 && i * 12 < failed.length; i++) {
    const sample = failed[i * 12];
    const start = new Date(sample.timestamp);
    const durationMin = rng.int(18, 220);
    incidents.push({
      id: `inc_${1000 + i}`,
      title: `${sample.failureReason}`,
      severity: rng.pick(['SEV1', 'SEV2', 'SEV2', 'SEV3']),
      status: i < 2 ? 'investigating' : 'resolved',
      startedAt: start.toISOString(),
      resolvedAt: i < 2 ? null : new Date(start.getTime() + durationMin * 60000).toISOString(),
      affectedAgent: AGENTS.find((a) => a.id === sample.agentId).name,
      impactedRuns: rng.int(8, 60),
      summary: `Elevated failures on ${AGENTS.find((a) => a.id === sample.agentId).name} traced to: ${sample.failureReason.toLowerCase()}.`,
    });
  }

  auditLog.push({
    id: 'audit_seed',
    actor: 'system',
    action: 'seed.generated',
    target: `${runs.length} runs`,
    at: new Date().toISOString(),
  });

  return { users, runs, incidents, auditLog };
}

function buildLogs(rng, status, agent, model, durationMs) {
  const base = [
    `[init] agent=${agent.name} model=${model.name}`,
    `[plan] decomposed task into ${rng.int(2, 6)} steps`,
    `[exec] applied edits to working tree`,
    `[test] running verification suite`,
  ];
  if (status === 'Failed') base.push(`[error] run failed after ${durationMs}ms`);
  else if (status === 'Partial Success') base.push(`[warn] completed with ${rng.int(1, 4)} unresolved warnings`);
  else base.push(`[done] completed successfully in ${durationMs}ms`);
  return base.map((line, i) => ({ ts: i, level: line.includes('[error]') ? 'error' : line.includes('[warn]') ? 'warn' : 'info', message: line }));
}
