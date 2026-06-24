// AgentOps Control Center — API server entrypoint.

import './util/loadEnv.js'; // must run before anything reads process.env
import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import { store } from './data/store.js';
import { bus, EVENTS } from './services/events.js';

import { tracing, structuredLogging } from './middleware/observability.js';
import { attachRole } from './middleware/rbac.js';

import dashboardRoutes from './routes/dashboard.js';
import runsRoutes from './routes/runs.js';
import reliabilityRoutes from './routes/reliability.js';
import modelsRoutes from './routes/models.js';
import alertsRoutes from './routes/alerts.js';
import adminRoutes from './routes/admin.js';
import systemRoutes from './routes/system.js';
import docsRoutes from './routes/docs.js';

const app = express();

app.use(cors({ exposedHeaders: ['x-trace-id', 'x-cache'] }));
app.use(express.json());
app.use(tracing);
app.use(attachRole);
app.use(structuredLogging);

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/runs', runsRoutes);
app.use('/api/reliability', reliabilityRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api', systemRoutes); // /api/health, /api/metrics, /api/status

app.get('/', (req, res) => {
  res.json({ name: 'AgentOps Control Center API', version: '1.0.0', docs: '/api/docs', health: '/api/health' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.originalUrl, traceId: req.traceId });
});

// Error handler — honors err.status for client errors (e.g. ingestion 400s).
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    process.stdout.write(JSON.stringify({ level: 'error', traceId: req.traceId, message: err.message, stack: err.stack }) + '\n');
  }
  res.status(status).json({
    error: status >= 500 ? 'internal_error' : 'bad_request',
    message: err.message,
    traceId: req.traceId,
  });
});

// ---- Event-driven processing layer subscribers ----------------------
// When config changes or runs are ingested, recompute derived state.
bus.on(EVENTS.CONFIG_CHANGED, () => {
  store.refreshAlerts();
});
bus.on('*', (evt) => {
  // Trace every domain event (structured).
  process.stdout.write(JSON.stringify({ level: 'info', kind: 'event', type: evt.type, at: new Date().toISOString() }) + '\n');
});

// Initialize the data layer (connects to PostgreSQL when DATABASE_URL is set,
// otherwise uses the in-memory seed) before accepting traffic.
await store.init();
if (store.dbError) {
  process.stdout.write(JSON.stringify({ level: 'warn', message: 'PostgreSQL unavailable, using in-memory store', error: store.dbError }) + '\n');
}

app.listen(config.port, () => {
  process.stdout.write(
    JSON.stringify({
      level: 'info',
      message: 'AgentOps Control Center API started',
      port: config.port,
      storage: store.mode,
      persistent: store.persistent,
      runsSeeded: store.runs.length,
      users: store.users.length,
      agents: store.agents.length,
      models: store.models.length,
      activeAlerts: store.alerts.length,
    }) + '\n'
  );
});
