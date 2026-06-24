import { Router } from 'express';
import { store } from '../data/store.js';
import { metrics } from '../middleware/observability.js';
import { cacheStats } from '../middleware/cache.js';

const router = Router();

function uptimeSeconds() {
  return Math.floor((Date.now() - store.startedAt) / 1000);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx].toFixed(2));
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: uptimeSeconds(),
    version: '1.0.0',
    storage: store.mode,
    persistent: store.persistent,
    checks: {
      datastore: store.runs.length > 0 ? 'ok' : 'degraded',
      cache: 'ok',
      eventBus: 'ok',
    },
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (Prometheus-style text exposition)
router.get('/metrics', (req, res) => {
  if (req.query.format === 'json') {
    return res.json({
      requestsTotal: metrics.requestsTotal,
      errorsTotal: metrics.errorsTotal,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      p50LatencyMs: percentile(metrics.latencies, 50),
      p95LatencyMs: percentile(metrics.latencies, 95),
      uptimeSeconds: uptimeSeconds(),
      runsIngested: store.runs.length,
      activeAlerts: store.alerts.length,
    });
  }
  res.setHeader('content-type', 'text/plain; version=0.0.4');
  res.send(
    [
      '# HELP agentops_requests_total Total HTTP requests handled',
      '# TYPE agentops_requests_total counter',
      `agentops_requests_total ${metrics.requestsTotal}`,
      '# HELP agentops_errors_total Total 5xx responses',
      '# TYPE agentops_errors_total counter',
      `agentops_errors_total ${metrics.errorsTotal}`,
      '# HELP agentops_cache_hits_total Cache hits',
      '# TYPE agentops_cache_hits_total counter',
      `agentops_cache_hits_total ${cacheStats.hits}`,
      `agentops_cache_misses_total ${cacheStats.misses}`,
      '# HELP agentops_request_latency_ms Request latency percentiles',
      '# TYPE agentops_request_latency_ms gauge',
      `agentops_request_latency_ms{quantile="0.5"} ${percentile(metrics.latencies, 50)}`,
      `agentops_request_latency_ms{quantile="0.95"} ${percentile(metrics.latencies, 95)}`,
      '# HELP agentops_runs_ingested Total agent runs in store',
      '# TYPE agentops_runs_ingested gauge',
      `agentops_runs_ingested ${store.runs.length}`,
      '',
    ].join('\n')
  );
});

// System status page data (component-level health)
router.get('/status', (req, res) => {
  const m = metrics;
  const errRate = m.requestsTotal ? (m.errorsTotal / m.requestsTotal) * 100 : 0;
  const components = [
    { name: 'REST API', status: 'operational', detail: `${m.requestsTotal} requests served` },
    { name: 'Evaluation Engine', status: 'operational', detail: `${store.runs.length} runs scored` },
    { name: 'Event Processing', status: 'operational', detail: 'event bus draining normally' },
    { name: 'Caching Layer', status: 'operational', detail: `${cacheStats.hits} hits / ${cacheStats.misses} misses` },
    { name: 'Alerting', status: store.alerts.some((a) => a.severity === 'critical') ? 'degraded' : 'operational', detail: `${store.alerts.length} active alerts` },
    { name: 'Datastore', status: 'operational', detail: 'in-memory store healthy' },
  ];
  const overall = components.every((c) => c.status === 'operational') ? 'All systems operational' : 'Partial degradation';
  res.json({
    overall,
    errorRatePct: Number(errRate.toFixed(2)),
    p95LatencyMs: percentile(m.latencies, 95),
    uptimeSeconds: uptimeSeconds(),
    components,
    incidents: store.incidents.filter((i) => i.status !== 'resolved'),
  });
});

export default router;
