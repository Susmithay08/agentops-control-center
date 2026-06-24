import { Router } from 'express';
import { store } from '../data/store.js';
import { modelComparison } from '../services/analytics.js';
import { cache } from '../middleware/cache.js';

const router = Router();

// Model comparison + ranking + recommendations
router.get('/comparison', cache(), (req, res) => {
  res.json(modelComparison(store));
});

// Recommendation engine output per task type
router.get('/recommendations', cache(), (req, res) => {
  res.json({ recommendations: store.recommendations(), weights: store.config.recommendationWeights });
});

export default router;
