// Caching layer simulation. An in-process TTL cache keyed by method+url.
// Emits X-Cache: HIT|MISS so the behaviour is observable from the client.

import { config } from '../config.js';

const cacheStore = new Map();
export const cacheStats = { hits: 0, misses: 0 };

export function cache(ttlMs = config.cache.ttlMs) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const hit = cacheStore.get(key);
    const now = Date.now();

    if (hit && now - hit.at < ttlMs) {
      cacheStats.hits += 1;
      res.setHeader('x-cache', 'HIT');
      res.setHeader('content-type', 'application/json');
      return res.status(200).send(hit.body);
    }

    cacheStats.misses += 1;
    res.setHeader('x-cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        cacheStore.set(key, { at: now, body: JSON.stringify(body) });
      } catch { /* non-serializable, skip cache */ }
      return originalJson(body);
    };
    next();
  };
}

export function invalidateCache() {
  cacheStore.clear();
}
