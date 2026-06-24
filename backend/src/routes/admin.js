import { Router } from 'express';
import { store } from '../data/store.js';
import { requireCapability } from '../middleware/rbac.js';
import { invalidateCache } from '../middleware/cache.js';

const router = Router();

// List everything the admin console manages.
router.get('/entities', (req, res) => {
  res.json({
    agents: store.agents,
    models: store.models,
    teams: store.teams,
    users: store.users,
    config: store.config,
  });
});

// Audit log (read)
router.get('/audit', (req, res) => {
  res.json({ entries: store.auditLog.slice(0, 100) });
});

// Create entities (write capability required)
const kinds = ['agents', 'models', 'teams', 'users'];
for (const kind of kinds) {
  router.post(`/${kind}`, requireCapability('write'), async (req, res, next) => {
    try {
      const record = await store.addEntity(kind, req.body || {}, req.role);
      invalidateCache();
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  });
}

// Update thresholds / SLO targets / weights (configure capability)
router.put('/config', requireCapability('configure'), async (req, res, next) => {
  try {
    const updated = await store.updateConfig(req.body || {}, req.role);
    invalidateCache();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
