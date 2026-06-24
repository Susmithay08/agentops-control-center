import { Router } from 'express';
import { store } from '../data/store.js';

const router = Router();

// Active alerts dashboard
router.get('/', (req, res) => {
  const alerts = store.refreshAlerts();
  res.json({
    active: alerts.filter((a) => a.status === 'active'),
    counts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
    },
    thresholds: {
      dailyCost: store.config.cost.dailyThreshold,
      failureRatePct: store.config.alerts.failureRatePct,
      latencySpikeMs: store.config.alerts.latencySpikeMs,
      sloFloor: store.config.alerts.sloFloor,
    },
  });
});

export default router;
