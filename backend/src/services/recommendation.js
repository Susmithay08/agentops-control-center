// Recommendation Engine
// -------------------------------------------------------------
// Recommends the best model provider for each task type using a
// weighted score:
//   40% Quality, 25% Cost, 20% Latency, 15% Reliability
//
// Cost and latency are inverted (lower is better) and all dimensions
// are normalized 0..1 across the candidate set before weighting.

import { config } from '../config.js';

const TASK_TYPES = [
  'Code Generation',
  'Code Review',
  'Test Generation',
  'Refactoring',
  'Documentation',
];

function normalize(values, invert = false) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => {
    const n = (v - min) / span;
    return invert ? 1 - n : n;
  });
}

// providerStats: [{ provider, quality, costPerRun, latencyMs, successRate }]
export function rankProviders(providerStats) {
  const w = config.recommendationWeights;
  if (providerStats.length === 0) return [];

  const qN = normalize(providerStats.map((p) => p.quality));
  const cN = normalize(providerStats.map((p) => p.costPerRun), true); // cheaper is better
  const lN = normalize(providerStats.map((p) => p.latencyMs), true); // faster is better
  const rN = normalize(providerStats.map((p) => p.successRate));

  return providerStats
    .map((p, i) => ({
      ...p,
      breakdown: {
        quality: Number((qN[i] * w.quality).toFixed(4)),
        cost: Number((cN[i] * w.cost).toFixed(4)),
        latency: Number((lN[i] * w.latency).toFixed(4)),
        reliability: Number((rN[i] * w.reliability).toFixed(4)),
      },
      score: Number(
        ((qN[i] * w.quality +
          cN[i] * w.cost +
          lN[i] * w.latency +
          rN[i] * w.reliability) *
          100).toFixed(1)
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

function explain(ranked, taskType) {
  if (ranked.length === 0) return 'Insufficient data for a recommendation.';
  const top = ranked[0];
  const driver = Object.entries(top.breakdown).sort((a, b) => b[1] - a[1])[0][0];
  const driverPhrase = {
    quality: 'the highest output quality score',
    cost: 'the best cost efficiency',
    latency: 'the lowest latency',
    reliability: 'the strongest reliability',
  }[driver];
  return `For ${taskType.toLowerCase()} tasks, ${top.provider} is recommended — it delivers ${driverPhrase} (weighted score ${top.score}/100, avg quality ${Math.round(
    top.quality
  )}, $${top.costPerRun.toFixed(3)}/run, ${Math.round(top.latencyMs)}ms, ${top.successRate.toFixed(
    1
  )}% success).`;
}

// Build a recommendation per task type from raw run records.
export function buildRecommendations(runs, models) {
  const modelById = new Map(models.map((m) => [m.id, m]));
  const recommendations = [];

  for (const taskType of TASK_TYPES) {
    const taskRuns = runs.filter((r) => r.taskType === taskType);
    const byProvider = new Map();

    for (const run of taskRuns) {
      const model = modelById.get(run.modelId);
      if (!model) continue;
      const key = model.provider;
      if (!byProvider.has(key)) {
        byProvider.set(key, { provider: key, quality: 0, costPerRun: 0, latencyMs: 0, success: 0, total: 0 });
      }
      const agg = byProvider.get(key);
      agg.quality += run.metrics.healthScore;
      agg.costPerRun += run.costUsd;
      agg.latencyMs += run.durationMs;
      agg.success += run.status === 'Failed' ? 0 : 1;
      agg.total += 1;
    }

    const providerStats = [...byProvider.values()]
      .filter((p) => p.total >= 3)
      .map((p) => ({
        provider: p.provider,
        quality: p.quality / p.total,
        costPerRun: p.costPerRun / p.total,
        latencyMs: p.latencyMs / p.total,
        successRate: (p.success / p.total) * 100,
        sampleSize: p.total,
      }));

    const ranked = rankProviders(providerStats);
    recommendations.push({
      taskType,
      ranking: ranked,
      recommended: ranked[0]?.provider ?? null,
      explanation: explain(ranked, taskType),
      weights: config.recommendationWeights,
    });
  }

  return recommendations;
}
