// Aggregation/analytics service. Turns raw runs into the executive
// metrics, time series and comparison tables the frontend renders.

import { config } from '../config.js';

const DAY = 86400000;

function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

export function dashboard(store) {
  const runs = store.runs;
  const total = runs.length;
  const failed = runs.filter((r) => r.status === 'Failed');
  const success = runs.filter((r) => r.status === 'Success');
  const successRate = total ? (success.length / total) * 100 : 0;
  const avgCost = total ? runs.reduce((s, r) => s + r.costUsd, 0) / total : 0;
  const avgLatency = total ? runs.reduce((s, r) => s + r.durationMs, 0) / total : 0;

  const todayKey = dayKey(Date.now());
  const failedToday = failed.filter((r) => dayKey(r.timestamp) === todayKey).length;

  // SLO compliance over the trailing window = non-failed / total.
  const compliance = total ? ((total - failed.length) / total) * 100 : 100;
  const errorBudget = 100 - config.slo.target; // % budget
  const budgetConsumed = Math.max(0, 100 - compliance);
  const errorBudgetRemaining = Math.max(0, ((errorBudget - budgetConsumed) / errorBudget) * 100);

  return {
    kpis: {
      totalRuns: total,
      successRate: round(successRate),
      avgCostPerRun: round(avgCost, 4),
      avgLatencyMs: Math.round(avgLatency),
      sloCompliance: round(compliance, 2),
      failedRunsToday: failedToday,
    },
    reliability: {
      sloTarget: config.slo.target,
      compliance: round(compliance, 2),
      errorBudgetRemaining: round(errorBudgetRemaining, 1),
    },
    charts: {
      usageTrend: usageTrend(runs),
      costByModel: costByModel(store),
      successRateByAgent: successRateByAgent(store),
      dailyFailureRate: dailyFailureRate(runs),
    },
  };
}

export function usageTrend(runs, days = 30) {
  const buckets = new Map();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey(now - i * DAY), 0);
  }
  for (const r of runs) {
    const k = dayKey(r.timestamp);
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + 1);
  }
  return [...buckets.entries()].map(([date, runs]) => ({ date, runs }));
}

export function costByModel(store) {
  const map = new Map();
  for (const r of store.runs) {
    const model = store.modelById(r.modelId);
    const name = model?.name ?? r.modelId;
    map.set(name, (map.get(name) || 0) + r.costUsd);
  }
  return [...map.entries()]
    .map(([model, cost]) => ({ model, cost: round(cost, 2) }))
    .sort((a, b) => b.cost - a.cost);
}

export function successRateByAgent(store) {
  const map = new Map();
  for (const r of store.runs) {
    const name = store.agentById(r.agentId)?.name ?? r.agentId;
    if (!map.has(name)) map.set(name, { total: 0, success: 0 });
    const a = map.get(name);
    a.total += 1;
    if (r.status !== 'Failed') a.success += 1;
  }
  return [...map.entries()]
    .map(([agent, v]) => ({ agent, successRate: round((v.success / v.total) * 100, 1), runs: v.total }))
    .sort((a, b) => b.successRate - a.successRate);
}

export function dailyFailureRate(runs, days = 30) {
  const totals = new Map();
  const fails = new Map();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(now - i * DAY);
    totals.set(k, 0);
    fails.set(k, 0);
  }
  for (const r of runs) {
    const k = dayKey(r.timestamp);
    if (!totals.has(k)) continue;
    totals.set(k, totals.get(k) + 1);
    if (r.status === 'Failed') fails.set(k, fails.get(k) + 1);
  }
  return [...totals.entries()].map(([date, total]) => ({
    date,
    failureRate: total ? round((fails.get(date) / total) * 100, 1) : 0,
  }));
}

// ---- Reliability page ------------------------------------------------
export function reliability(store) {
  const runs = store.runs;
  const total = runs.length;
  const failed = runs.filter((r) => r.status === 'Failed').length;
  const successRate = total ? ((total - failed) / total) * 100 : 100;
  const avgLatency = total ? runs.reduce((s, r) => s + r.durationMs, 0) / total : 0;
  const retries = runs.reduce((s, r) => s + (r.retries || 0), 0);

  const errorBudget = 100 - config.slo.target;
  const burned = Math.max(0, config.slo.target - successRate);
  const burnRate = errorBudget ? round((burned / errorBudget) * 100, 1) : 0;

  return {
    slo: {
      target: config.slo.target,
      availability: round(successRate, 2),
      successRate: round(successRate, 2),
      avgResponseTimeMs: Math.round(avgLatency),
      failedRuns: failed,
      retries,
      errorBudgetBurnRatePct: burnRate,
    },
    trends: {
      successRate: dailySuccessRate(runs),
      latency: dailyLatency(runs),
      failureRate: dailyFailureRate(runs),
    },
    incidents: store.incidents,
    topFailureCauses: topFailureCauses(runs),
  };
}

function dailySuccessRate(runs, days = 30) {
  return dailyFailureRate(runs, days).map((d) => ({ date: d.date, successRate: round(100 - d.failureRate, 1) }));
}

function dailyLatency(runs, days = 30) {
  const sum = new Map();
  const cnt = new Map();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(now - i * DAY);
    sum.set(k, 0); cnt.set(k, 0);
  }
  for (const r of runs) {
    const k = dayKey(r.timestamp);
    if (!sum.has(k)) continue;
    sum.set(k, sum.get(k) + r.durationMs);
    cnt.set(k, cnt.get(k) + 1);
  }
  return [...sum.entries()].map(([date, s]) => ({ date, latencyMs: cnt.get(date) ? Math.round(s / cnt.get(date)) : 0 }));
}

export function topFailureCauses(runs) {
  const map = new Map();
  for (const r of runs) {
    if (r.status === 'Failed' && r.failureReason) {
      map.set(r.failureReason, (map.get(r.failureReason) || 0) + 1);
    }
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
  return [...map.entries()]
    .map(([cause, count]) => ({ cause, count, pct: round((count / total) * 100, 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

// ---- Model comparison -----------------------------------------------
export function modelComparison(store) {
  const byProvider = new Map();
  for (const r of store.runs) {
    const provider = store.modelById(r.modelId)?.provider ?? 'Unknown';
    if (!byProvider.has(provider)) {
      byProvider.set(provider, { provider, total: 0, success: 0, cost: 0, latency: 0, health: 0 });
    }
    const p = byProvider.get(provider);
    p.total += 1;
    if (r.status !== 'Failed') p.success += 1;
    p.cost += r.costUsd;
    p.latency += r.durationMs;
    p.health += r.metrics.healthScore;
  }

  const rows = [...byProvider.values()].map((p) => ({
    provider: p.provider,
    avgCost: round(p.cost / p.total, 4),
    avgLatencyMs: Math.round(p.latency / p.total),
    successRate: round((p.success / p.total) * 100, 1),
    healthScore: round(p.health / p.total, 1),
    runs: p.total,
  }));

  // Composite ranking score (quality-weighted).
  const ranked = rows
    .map((r) => ({
      ...r,
      compositeScore: round(
        r.healthScore * 0.4 +
          r.successRate * 0.25 +
          (100 - Math.min(100, (r.avgLatencyMs / 12000) * 100)) * 0.2 +
          (100 - Math.min(100, (r.avgCost / 0.15) * 100)) * 0.15,
        1
      ),
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((r, i) => ({ rank: i + 1, ...r }));

  return { ranking: ranked, recommendations: store.recommendations() };
}

function round(n, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
