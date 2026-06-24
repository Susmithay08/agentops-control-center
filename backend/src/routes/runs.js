import { Router } from 'express';
import { store, queryRuns } from '../data/store.js';
import { cache, invalidateCache } from '../middleware/cache.js';

const router = Router();

// GET /api/runs  -> searchable, filterable, sortable, paginated table
router.get('/', cache(8000), (req, res) => {
  const enriched = store.runs.map((r) => store.enrich(r));
  const result = queryRuns(enriched, req.query);
  res.json(result);
});

// POST /api/runs -> ingest a real run. The submitted code is analyzed and
// scored by the evaluation engine; the run is persisted and made queryable.
router.post('/', async (req, res, next) => {
  try {
    const run = await store.ingestRun(req.body || {});
    invalidateCache(); // make the new run visible immediately
    res.status(201).json(run);
  } catch (err) {
    next(err);
  }
});

// Filter option metadata for the UI (dropdowns).
router.get('/filters', cache(60000), (req, res) => {
  res.json({
    agents: store.agents.map((a) => ({ id: a.id, name: a.name })),
    models: store.models.map((m) => ({ id: m.id, name: m.name, provider: m.provider })),
    teams: store.teams.map((t) => ({ id: t.id, name: t.name })),
    taskTypes: ['Code Generation', 'Code Review', 'Test Generation', 'Refactoring', 'Documentation'],
    statuses: ['Success', 'Partial Success', 'Failed'],
    providers: [...new Set(store.models.map((m) => m.provider))],
  });
});

// GET /api/runs/:id -> full run detail
router.get('/:id', (req, res) => {
  const run = store.runs.find((r) => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'not_found', message: `Run ${req.params.id} not found`, traceId: req.traceId });
  }
  res.json(store.enrich(run));
});

export default router;
