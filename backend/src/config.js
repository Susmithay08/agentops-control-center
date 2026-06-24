// Central configuration for thresholds, SLO targets and scoring weights.
// These are mutable at runtime via the Admin API (in-memory).

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,

  // Service Level Objectives
  slo: {
    target: 99.5, // % availability / success target
    latencyMs: 9000, // p95 latency objective
  },

  // Cost governance (USD)
  cost: {
    dailyThreshold: 250, // alert when daily spend exceeds this
    perRunWarn: 0.85, // warn when a single run costs more than this
  },

  // Alerting thresholds
  alerts: {
    failureRatePct: 12, // alert when failure rate exceeds this %
    latencySpikeMs: 14000, // alert when avg latency exceeds this
    sloFloor: 99.5, // alert when compliance drops below this
  },

  // Recommendation engine weights (must sum to 1.0)
  recommendationWeights: {
    quality: 0.4,
    cost: 0.25,
    latency: 0.2,
    reliability: 0.15,
  },

  // Caching layer simulation
  cache: {
    ttlMs: 15000,
  },
};

export const TASK_TYPES = [
  'Code Generation',
  'Code Review',
  'Test Generation',
  'Refactoring',
  'Documentation',
];

export const STATUSES = ['Success', 'Partial Success', 'Failed'];

export const ROLES = ['admin', 'manager', 'engineer', 'viewer'];
