// PostgreSQL client wrapper.
// Enabled only when DATABASE_URL (or PG* env vars) are present. When absent
// the application runs against the in-memory store with identical data.

import pg from 'pg';

const { Pool } = pg;

// pg returns NUMERIC as string to preserve precision; we want numbers.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC

let pool = null;

export const db = {
  isEnabled() {
    return Boolean(process.env.DATABASE_URL || process.env.PGHOST);
  },

  async connect() {
    if (!this.isEnabled()) return false;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    // Fail fast if the database is unreachable.
    const client = await pool.connect();
    client.release();
    return true;
  },

  async query(text, params) {
    if (!pool) throw new Error('Database pool not initialized');
    return pool.query(text, params);
  },

  // Run a function inside a transaction with a dedicated client.
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async close() {
    if (pool) await pool.end();
    pool = null;
  },
};
