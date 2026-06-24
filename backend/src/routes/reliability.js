import { Router } from 'express';
import { store } from '../data/store.js';
import { reliability } from '../services/analytics.js';
import { cache } from '../middleware/cache.js';

const router = Router();

router.get('/', cache(), (req, res) => {
  res.json(reliability(store));
});

export default router;
