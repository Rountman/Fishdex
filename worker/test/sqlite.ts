// The D1 subset from app.ts on top of node:sqlite (D1 is SQLite), with the real migrations.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Db, Stmt } from '../src/app';

const MIGRATIONS = join(import.meta.dirname, '..', 'migrations');

export function memoryDb(): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  for (const f of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) raw.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));

  type Bound = Stmt & { exec(): { changes: number } };
  const stmt = (sql: string, values: unknown[] = []): Bound => {
    const s = () => raw.prepare(sql);
    const args = values as (string | number | null)[];
    return {
      bind: (...v) => stmt(sql, v),
      first: async <T>() => ((s().get(...args) as T | undefined) ?? null),
      all: async <T>() => ({ results: s().all(...args) as T[] }),
      run: async () => ({ meta: { changes: Number(s().run(...args).changes) } }),
      exec: () => ({ changes: Number(s().run(...args).changes) }),
    };
  };
  return {
    raw,
    prepare: sql => stmt(sql),
    // D1 runs a batch as one transaction
    async batch(list) {
      raw.exec('BEGIN');
      try {
        const out = list.map(x => (x as Bound).exec());
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
