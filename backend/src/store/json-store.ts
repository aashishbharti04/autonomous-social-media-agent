import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../config.js';

/**
 * Minimal synchronous JSON persistence. Keeps curated data (connected accounts,
 * media metadata) on disk under `data/` so it survives restarts — without
 * pulling in a database. Swap for Postgres by changing DB_PROVIDER.
 */
export class JsonStore<T> {
  private file: string;

  constructor(filename: string, private fallback: T) {
    this.file = path.join(paths.dataDir, filename);
  }

  read(): T {
    try {
      if (!fs.existsSync(this.file)) return this.fallback;
      return JSON.parse(fs.readFileSync(this.file, 'utf8')) as T;
    } catch {
      return this.fallback;
    }
  }

  write(value: T): void {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(value, null, 2), 'utf8');
  }
}
