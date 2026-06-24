import { Router } from 'express';

const router = Router();

// Machine-readable API documentation consumed by the /docs page.
const SPEC = {
  name: 'AgentOps Control Center API',
  version: '1.0.0',
  baseUrl: '/api',
  auth: 'Send an x-role header (admin | manager | engineer | viewer). Send x-trace-id to propagate a trace.',
  groups: [
    {
      group: 'Dashboard & Analytics',
      endpoints: [
        { method: 'GET', path: '/api/dashboard', desc: 'Executive KPIs, charts and reliability summary.' },
        { method: 'GET', path: '/api/reliability', desc: 'SLO dashboard, trends, incidents, top failure causes.' },
        { method: 'GET', path: '/api/models/comparison', desc: 'Provider comparison + ranking table.' },
        { method: 'GET', path: '/api/models/recommendations', desc: 'Best-model recommendation per task type.' },
      ],
    },
    {
      group: 'Agent Runs',
      endpoints: [
        { method: 'GET', path: '/api/runs', desc: 'Paginated runs. Query: search, status, agentId, modelId, teamId, taskType, provider, sort, dir, page, size.' },
        { method: 'POST', path: '/api/runs', desc: 'Ingest a real run. Body: { agentName, modelName|provider, taskType, code, [userEmail, status, costUsd, durationMs, files, testCoverage] }. The code is statically analyzed and scored by the evaluation engine.' },
        { method: 'GET', path: '/api/runs/filters', desc: 'Filter option metadata for the UI.' },
        { method: 'GET', path: '/api/runs/:id', desc: 'Full run detail with metrics, snippets, logs, failure reasons.' },
      ],
    },
    {
      group: 'Alerting',
      endpoints: [
        { method: 'GET', path: '/api/alerts', desc: 'Active alerts, counts and configured thresholds.' },
      ],
    },
    {
      group: 'Admin (RBAC protected)',
      endpoints: [
        { method: 'GET', path: '/api/admin/entities', desc: 'Agents, models, teams, users and config.' },
        { method: 'GET', path: '/api/admin/audit', desc: 'Audit log of mutating actions.' },
        { method: 'POST', path: '/api/admin/{agents|models|teams|users}', desc: 'Create entity. Requires write capability.' },
        { method: 'PUT', path: '/api/admin/config', desc: 'Update SLO/cost/alert thresholds. Requires configure capability.' },
      ],
    },
    {
      group: 'System',
      endpoints: [
        { method: 'GET', path: '/api/health', desc: 'Health check.' },
        { method: 'GET', path: '/api/metrics', desc: 'Prometheus metrics (add ?format=json for JSON).' },
        { method: 'GET', path: '/api/status', desc: 'Component-level system status.' },
        { method: 'GET', path: '/api/docs', desc: 'This API specification.' },
      ],
    },
  ],
};

router.get('/', (req, res) => res.json(SPEC));

export default router;
