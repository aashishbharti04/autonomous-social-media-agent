import { config } from '../config.js';
import { MemoryStore } from './memory-store.js';
import { PostgresStore } from './postgres-store.js';
import type { Store } from './store.js';

/**
 * The active data store. Postgres when DB_PROVIDER=postgres and a DATABASE_URL
 * is set; otherwise the in-memory store (default — works offline, resets on
 * restart). Call `store.init()` once at startup.
 */
export const store: Store =
  config.db.provider === 'postgres' && config.db.url
    ? new PostgresStore()
    : new MemoryStore();

export type { Store } from './store.js';
