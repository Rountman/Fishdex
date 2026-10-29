// localStorage access for progress. Every call is guarded: private windows, blocked
// storage or a full quota must never break the app, and stored data is never
// silently thrown away.
import { emptyProgress, keyFor, migrate, SCHEMA_VERSION, STORAGE_KEY, type Progress } from './schema';

/** The part of the Web Storage API we use (lets tests pass a fake). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadResult = {
  progress: Progress;
  /** The stored value could not be read; it was copied to `backupKey` and the app starts empty. */
  recovered?: { backupKey: string };
  /** Stored by a newer version of the app: shown read-only, never overwritten. */
  blocked?: { version: number };
  /** Upgraded from an older schema version. */
  migratedFrom?: number;
};

export type ProgressStore = {
  /** false = nothing persists (the UI shows a quiet notice). */
  readonly available: boolean;
  load(now?: Date): LoadResult;
  /** false when the write failed or is blocked. */
  save(p: Progress): boolean;
};

/** window.localStorage, or null when even touching it throws (sandboxed iframes, some privacy modes). */
export function browserStorage(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function probe(store: KeyValueStore | null): boolean {
  if (!store) return false;
  try {
    const k = 'fishdex:probe';
    store.setItem(k, '1');
    store.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function read(store: KeyValueStore, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}

function write(store: KeyValueStore, key: string, value: string): boolean {
  try { store.setItem(key, value); return true; } catch { return false; }
}

export function createProgressStore(backend: KeyValueStore | null = browserStorage()): ProgressStore {
  const available = probe(backend);
  let memory: Progress | null = null;  // used when storage is unavailable
  let blocked = false;

  function load(now = new Date()): LoadResult {
    if (!available || !backend) return { progress: memory ?? emptyProgress(now) };

    const current = read(backend, STORAGE_KEY);
    if (current !== null) {
      let parsed: unknown;
      try { parsed = JSON.parse(current); } catch { parsed = undefined; }
      const res = migrate(parsed);
      if (res.ok) return { progress: res.progress };
      if (res.reason === 'future') {
        blocked = true;
        return { progress: emptyProgress(now), blocked: { version: res.version ?? SCHEMA_VERSION + 1 } };
      }
      const backupKey = `${STORAGE_KEY}:unreadable:${now.toISOString()}`;
      write(backend, backupKey, current);
      return { progress: emptyProgress(now), recovered: { backupKey } };
    }

    // nothing under the current key: look for an older schema and upgrade it
    for (let v = SCHEMA_VERSION - 1; v >= 1; v--) {
      const old = read(backend, keyFor(v));
      if (old === null) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(old); } catch { parsed = undefined; }
      const res = migrate(parsed);
      if (res.ok) {
        write(backend, STORAGE_KEY, JSON.stringify(res.progress)); // the old key is kept as a fallback
        return { progress: res.progress, migratedFrom: v };
      }
    }
    return { progress: emptyProgress(now) };
  }

  function save(p: Progress): boolean {
    if (!available || !backend) { memory = p; return false; }
    if (blocked) return false;
    return write(backend, STORAGE_KEY, JSON.stringify(p));
  }

  return { available, load, save };
}
