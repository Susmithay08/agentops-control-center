// Observability middleware: request tracing IDs + structured JSON logging.

import { randomUUID } from 'node:crypto';

export const metrics = {
  requestsTotal: 0,
  errorsTotal: 0,
  byRoute: new Map(),
  latencies: [],
};

export function tracing(req, res, next) {
  const traceId = req.headers['x-trace-id'] || `trc_${randomUUID().slice(0, 8)}`;
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}

export function structuredLogging(req, res, next) {
  const start = process.hrtime.bigint();
  metrics.requestsTotal += 1;

  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.latencies.push(durMs);
    if (metrics.latencies.length > 1000) metrics.latencies.shift();
    const routeKey = `${req.method} ${req.route?.path || req.path}`;
    metrics.byRoute.set(routeKey, (metrics.byRoute.get(routeKey) || 0) + 1);
    if (res.statusCode >= 500) metrics.errorsTotal += 1;

    const log = {
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durMs.toFixed(2)),
      role: req.role || 'anonymous',
      cache: res.getHeader('x-cache') || 'n/a',
    };
    // Structured single-line JSON log.
    process.stdout.write(JSON.stringify(log) + '\n');
  });

  next();
}
