// Alerting System
// -------------------------------------------------------------
// Generates alerts when:
//   - Daily cost exceeds threshold
//   - Failure rate exceeds threshold
//   - SLO drops below target
//   - Latency spikes above limit
//
// Pure evaluation function: given current metrics + thresholds it
// returns the set of alerts that should be active.

import { config } from '../config.js';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeAlerts(runs) {
  const alerts = [];
  const now = Date.now();
  const todayStart = startOfToday();

  const today = runs.filter((r) => new Date(r.timestamp).getTime() >= todayStart);
  const recent = runs.filter((r) => now - new Date(r.timestamp).getTime() <= 24 * 3600 * 1000);

  // 1. Daily cost
  const dailyCost = today.reduce((s, r) => s + r.costUsd, 0);
  if (dailyCost > config.cost.dailyThreshold) {
    alerts.push(mk('cost', 'critical', 'Daily cost threshold exceeded',
      `Spend today is $${dailyCost.toFixed(2)}, above the $${config.cost.dailyThreshold} threshold.`,
      { dailyCost, threshold: config.cost.dailyThreshold }));
  }

  // 2. Failure rate (last 24h)
  if (recent.length > 0) {
    const failures = recent.filter((r) => r.status === 'Failed').length;
    const failureRate = (failures / recent.length) * 100;
    if (failureRate > config.alerts.failureRatePct) {
      alerts.push(mk('reliability', 'critical', 'Failure rate above threshold',
        `Failure rate over the last 24h is ${failureRate.toFixed(1)}%, above the ${config.alerts.failureRatePct}% limit.`,
        { failureRate, threshold: config.alerts.failureRatePct }));
    }

    // 3. SLO compliance
    const compliance = ((recent.length - failures) / recent.length) * 100;
    if (compliance < config.alerts.sloFloor) {
      alerts.push(mk('slo', 'warning', 'SLO compliance below target',
        `Current compliance is ${compliance.toFixed(2)}%, below the ${config.slo.target}% SLO target.`,
        { compliance, target: config.slo.target }));
    }

    // 4. Latency spike
    const avgLatency = recent.reduce((s, r) => s + r.durationMs, 0) / recent.length;
    if (avgLatency > config.alerts.latencySpikeMs) {
      alerts.push(mk('latency', 'warning', 'Latency spike detected',
        `Average latency over the last 24h is ${Math.round(avgLatency)}ms, above the ${config.alerts.latencySpikeMs}ms limit.`,
        { avgLatency, threshold: config.alerts.latencySpikeMs }));
    }
  }

  return alerts;
}

let seq = 0;
function mk(category, severity, title, message, context) {
  return {
    id: `alert_${category}_${++seq}`,
    category,
    severity,
    title,
    message,
    context,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}
