import { describe, expect, it } from 'vitest';
import { exportFileName, exportJson, fishState, itemState, merge, ownedCount, readImport, replace, restore, restoreItem, toggle, toggleOwned, totals } from './progress';
import { emptyProgress, keyFor, migrate, MIGRATIONS, SCHEMA_VERSION, STORAGE_KEY, type Migration, type Progress } from './schema';
import { createProgressStore, type KeyValueStore } from './storage';

const T0 = new Date('2026-10-01T10:00:00Z');
const T1 = new Date('2026-10-02T10:00:00Z');
const T2 = new Date('2026-10-03T10:00:00Z');

const doc = (fish: Progress['fish'], updatedAt = T0.toISOString(), furniture: Progress['furniture'] = {}): Progress =>
  ({ version: SCHEMA_VERSION, updatedAt, fish, furniture });

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
class ThrowingStore implements KeyValueStore {
  getItem(): string | null { throw new DOMException('denied', 'SecurityError'); }
  setItem(): void { throw new DOMException('denied', 'SecurityError'); }
  removeItem(): void { throw new DOMException('denied', 'SecurityError'); }
}
class FullStore extends MemoryStore {
  full = false;
  override setItem(k: string, v: string) {
    if (this.full) throw new DOMException('full', 'QuotaExceededError');
    super.setItem(k, v);
  }
}

describe('toggle', () => {
  it('marks caught and records the first catch time', () => {
    const p = toggle(emptyProgress(T0), 'arapaima', 'caught', T1);
    expect(fishState(p, 'arapaima')).toEqual({ caught: true, caughtGlowing: false, caughtAt: T1.toISOString() });
    expect(p.updatedAt).toBe(T1.toISOString());
  });

  it('keeps caught and glowing independent', () => {
    let p = toggle(emptyProgress(T0), 'arapaima', 'caughtGlowing', T1);
    expect(fishState(p, 'arapaima')).toEqual({ caught: false, caughtGlowing: true });
    p = toggle(p, 'arapaima', 'caught', T2);
    expect(fishState(p, 'arapaima')).toMatchObject({ caught: true, caughtGlowing: true });
  });

  it('drops the entry when nothing is true any more (only fish with a true are stored)', () => {
    let p = toggle(emptyProgress(T0), 'eel', 'caught', T1);
    p = toggle(p, 'eel', 'caught', T2);
    expect(p.fish).toEqual({});
  });

  it('removes caughtAt when uncaught but keeps glowing', () => {
    let p = toggle(emptyProgress(T0), 'eel', 'caught', T1);
    p = toggle(p, 'eel', 'caughtGlowing', T1);
    p = toggle(p, 'eel', 'caught', T2);
    expect(p.fish.eel).toEqual({ caught: false, caughtGlowing: true });
  });

  it('toggles the backyard state', () => {
    let p = toggle(emptyProgress(T0), 'fire-eel', 'bred', T1);
    expect(p.fish['fire-eel']).toEqual({ caught: false, caughtGlowing: false, bred: true });
    p = toggle(p, 'fire-eel', 'bred', T2);
    expect(p.fish['fire-eel']).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const before = emptyProgress(T0);
    toggle(before, 'eel', 'caught', T1);
    expect(before.fish).toEqual({});
  });

  it('undo restores the previous state', () => {
    const p0 = toggle(emptyProgress(T0), 'eel', 'caught', T1);
    const prev = fishState(p0, 'eel');
    const p1 = toggle(p0, 'eel', 'caught', T2);
    expect(restore(p1, 'eel', prev, T2).fish.eel).toEqual(prev);
  });
});

describe('furniture', () => {
  it('marks owned with the first time and drops the entry when unowned', () => {
    let p = toggleOwned(emptyProgress(T0), 'gold-tv', T1);
    expect(itemState(p, 'gold-tv')).toEqual({ owned: true, ownedAt: T1.toISOString() });
    expect(p.updatedAt).toBe(T1.toISOString());
    p = toggleOwned(p, 'gold-tv', T2);
    expect(p.furniture).toEqual({});
    expect(itemState(p, 'gold-tv')).toEqual({ owned: false });
  });

  it('is independent of fish progress', () => {
    const p = toggleOwned(toggle(emptyProgress(T0), 'eel', 'caught', T1), 'eel', T1);
    expect(p.fish.eel.caught).toBe(true);
    expect(p.furniture.eel.owned).toBe(true);
  });

  it('undo restores the previous state', () => {
    const p0 = toggleOwned(emptyProgress(T0), 'gold-tv', T1);
    const prev = itemState(p0, 'gold-tv');
    const p1 = toggleOwned(p0, 'gold-tv', T2);
    expect(restoreItem(p1, 'gold-tv', prev, T2).furniture['gold-tv']).toEqual(prev);
  });

  it('counts only items present in the data', () => {
    const p = doc({}, T0.toISOString(), { 'gold-tv': { owned: true }, 'gone-item': { owned: true } });
    expect(ownedCount(p, ['gold-tv', 'ice-bed'])).toBe(1);
  });
});

describe('migrate', () => {
  it('upgrades v1 (fish only) to v2 without touching the fish', () => {
    const fish = { eel: { caught: true, caughtGlowing: false, caughtAt: T0.toISOString() } };
    expect(migrate({ version: 1, updatedAt: T0.toISOString(), fish })).toEqual({
      ok: true, migratedFrom: 1, progress: { version: 2, updatedAt: T0.toISOString(), fish, furniture: {} },
    });
  });

  it('normalizes furniture entries', () => {
    const res = migrate({
      version: 2, updatedAt: T0.toISOString(), fish: {},
      furniture: { a: { owned: true, ownedAt: T0.toISOString() }, b: { owned: false }, c: { owned: 'yes' }, d: 1, e: { owned: true, ownedAt: 'nope' } },
    });
    expect(res.ok && res.progress.furniture).toEqual({ a: { owned: true, ownedAt: T0.toISOString() }, e: { owned: true } });
  });

  it('accepts the current version and normalizes entries', () => {
    const res = migrate({
      version: 1, updatedAt: T0.toISOString(),
      fish: {
        a: { caught: true, caughtGlowing: false, caughtAt: T0.toISOString() },
        b: { caught: false, caughtGlowing: false },       // nothing true: dropped
        c: { caught: 'yes', caughtGlowing: true },         // wrong type becomes false
        d: 'garbage',                                       // dropped
        e: { caught: false, caughtGlowing: false, bred: true },
      },
    });
    expect(res.ok && res.progress.fish).toEqual({
      a: { caught: true, caughtGlowing: false, caughtAt: T0.toISOString() },
      c: { caught: false, caughtGlowing: true },
      e: { caught: false, caughtGlowing: false, bred: true },
    });
  });

  it('runs migrations from an older version up to the current one', () => {
    // a hypothetical v0 stored a list of caught ids
    const migrations: Record<number, Migration> = {
      0: d => ({ updatedAt: d.savedAt, fish: Object.fromEntries((d.caught as string[]).map(id => [id, { caught: true, caughtGlowing: false }])) }),
    };
    const res = migrate({ version: 0, savedAt: T0.toISOString(), caught: ['eel', 'asp'] }, { ...MIGRATIONS, ...migrations });
    expect(res).toEqual({
      ok: true, migratedFrom: 0,
      progress: {
        version: SCHEMA_VERSION, updatedAt: T0.toISOString(), furniture: {},
        fish: { eel: { caught: true, caughtGlowing: false }, asp: { caught: true, caughtGlowing: false } },
      },
    });
  });

  it('refuses a version with no migration path instead of guessing', () => {
    expect(migrate({ version: 0, fish: {} }, {})).toEqual({ ok: false, reason: 'invalid', version: 0 });
  });

  it('refuses documents from a newer app version', () => {
    expect(migrate({ version: SCHEMA_VERSION + 1, fish: {} })).toEqual({ ok: false, reason: 'future', version: SCHEMA_VERSION + 1 });
  });

  it.each([null, 42, 'x', [], {}, { version: '1', fish: {} }, { version: 1 }, { version: 1, fish: [] }])(
    'rejects malformed input %j', bad => expect(migrate(bad).ok).toBe(false));
});

describe('import', () => {
  const known = new Set(['eel', 'asp', 'fire-eel']);

  it('previews a valid backup', () => {
    const file = exportJson(doc({
      eel: { caught: true, caughtGlowing: true },
      'fire-eel': { caught: true, caughtGlowing: false, bred: true },
      'gone-fish': { caught: true, caughtGlowing: false },
    }, T1.toISOString()));
    const res = readImport(file, known);
    expect(res.ok && { ...res.preview, progress: undefined }).toEqual({
      progress: undefined, count: 3, caught: 3, caughtGlowing: 1, bred: 1, unknown: 1, owned: 0, unknownItems: 0, savedAt: T1,
    });
  });

  it.each([
    ['not json', 'json'],
    ['{"fish":{}}', 'invalid'],
    [JSON.stringify({ version: 99, fish: {} }), 'future'],
  ])('rejects %s', (text, reason) => expect(readImport(text, known)).toEqual({ ok: false, reason }));

  it('merge never unchecks and adds what the file has', () => {
    const current = doc({
      eel: { caught: true, caughtGlowing: false, caughtAt: T1.toISOString() },
      asp: { caught: false, caughtGlowing: true },
    });
    const incoming = doc({
      eel: { caught: false, caughtGlowing: true },
      'fire-eel': { caught: false, caughtGlowing: false, bred: true },
      'gone-fish': { caught: true, caughtGlowing: false },
    });
    expect(merge(current, incoming, T2)).toEqual({
      version: SCHEMA_VERSION, updatedAt: T2.toISOString(), furniture: {},
      fish: {
        eel: { caught: true, caughtGlowing: true, caughtAt: T1.toISOString() },
        asp: { caught: false, caughtGlowing: true },
        'fire-eel': { caught: false, caughtGlowing: false, bred: true },
        'gone-fish': { caught: true, caughtGlowing: false },  // unknown ids are kept
      },
    });
  });

  it('merge adds owned furniture and keeps the earliest time', () => {
    const a = doc({}, T0.toISOString(), { 'gold-tv': { owned: true, ownedAt: T2.toISOString() } });
    const b = doc({}, T0.toISOString(), { 'gold-tv': { owned: true, ownedAt: T0.toISOString() }, 'ice-bed': { owned: true } });
    expect(merge(a, b, T2).furniture).toEqual({ 'gold-tv': { owned: true, ownedAt: T0.toISOString() }, 'ice-bed': { owned: true } });
  });

  it('previews owned furniture in a backup', () => {
    const file = exportJson(doc({}, T1.toISOString(), { 'gold-tv': { owned: true }, 'gone-item': { owned: true } }));
    const res = readImport(file, known, new Set(['gold-tv']));
    expect(res.ok && [res.preview.owned, res.preview.unknownItems]).toEqual([2, 1]);
  });

  it('imports a v1 backup (made before furniture existed)', () => {
    const file = JSON.stringify({ version: 1, updatedAt: T1.toISOString(), fish: { eel: { caught: true, caughtGlowing: false } } });
    const res = readImport(file, known);
    expect(res.ok && res.preview.progress).toEqual(doc({ eel: { caught: true, caughtGlowing: false } }, T1.toISOString()));
  });

  it('merge keeps the earliest catch time', () => {
    const a = doc({ eel: { caught: true, caughtGlowing: false, caughtAt: T2.toISOString() } });
    const b = doc({ eel: { caught: true, caughtGlowing: false, caughtAt: T0.toISOString() } });
    expect(merge(a, b, T2).fish.eel.caughtAt).toBe(T0.toISOString());
  });

  it('replace uses only the file', () => {
    const incoming = doc({ asp: { caught: true, caughtGlowing: false } });
    expect(replace(incoming, T2)).toEqual({ version: SCHEMA_VERSION, updatedAt: T2.toISOString(), furniture: {}, fish: { asp: { caught: true, caughtGlowing: false } } });
  });

  it('export round-trips and names the file by local date', () => {
    const p = toggle(emptyProgress(T0), 'eel', 'caught', T1);
    const back = readImport(exportJson(p), known);
    expect(back.ok && back.preview.progress).toEqual(p);
    expect(exportFileName(new Date(2026, 9, 5, 23, 30))).toBe('fishdex-progress-2026-10-05.json');
  });

  it('totals count only fish present in the data', () => {
    const p = doc({ eel: { caught: true, caughtGlowing: true }, 'gone-fish': { caught: true, caughtGlowing: false } });
    expect(totals(p, known)).toEqual({ caught: 1, caughtGlowing: 1, bred: 0 });
  });
});

describe('storage', () => {
  it('starts empty and round-trips', () => {
    const backend = new MemoryStore();
    const store = createProgressStore(backend);
    expect(store.available).toBe(true);
    expect(store.load(T0).progress).toEqual(emptyProgress(T0));
    const p = toggle(emptyProgress(T0), 'eel', 'caught', T1);
    expect(store.save(p)).toBe(true);
    expect(JSON.parse(backend.getItem(STORAGE_KEY)!)).toEqual(p);
    expect(createProgressStore(backend).load().progress).toEqual(p);
  });

  it('uses the namespaced, versioned key', () => {
    expect(STORAGE_KEY).toBe('fishdex:progress:v2');
  });

  it('upgrades progress stored under the v1 key and keeps the old key as a fallback', () => {
    const backend = new MemoryStore();
    const v1 = JSON.stringify({ version: 1, updatedAt: T0.toISOString(), fish: { eel: { caught: true, caughtGlowing: false } } });
    backend.setItem(keyFor(1), v1);
    const res = createProgressStore(backend).load(T1);
    expect(res.migratedFrom).toBe(1);
    expect(res.progress).toEqual(doc({ eel: { caught: true, caughtGlowing: false } }));
    expect(JSON.parse(backend.getItem(STORAGE_KEY)!)).toEqual(res.progress);
    expect(backend.getItem(keyFor(1))).toBe(v1);
  });

  it('backs up unreadable data instead of discarding it', () => {
    const backend = new MemoryStore();
    backend.setItem(STORAGE_KEY, '{broken');
    const res = createProgressStore(backend).load(T0);
    expect(res.progress.fish).toEqual({});
    expect(res.recovered?.backupKey).toBe(`${STORAGE_KEY}:unreadable:${T0.toISOString()}`);
    expect(backend.getItem(res.recovered!.backupKey)).toBe('{broken');
  });

  it('never overwrites progress written by a newer version', () => {
    const backend = new MemoryStore();
    const future = JSON.stringify({ version: SCHEMA_VERSION + 1, fish: { eel: { whatever: 1 } } });
    backend.setItem(STORAGE_KEY, future);
    const store = createProgressStore(backend);
    expect(store.load(T0).blocked).toEqual({ version: SCHEMA_VERSION + 1 });
    expect(store.save(toggle(emptyProgress(T0), 'asp', 'caught', T1))).toBe(false);
    expect(backend.getItem(STORAGE_KEY)).toBe(future);
  });

  it('works in memory when localStorage throws', () => {
    const store = createProgressStore(new ThrowingStore());
    expect(store.available).toBe(false);
    const p = toggle(store.load(T0).progress, 'eel', 'caught', T1);
    expect(store.save(p)).toBe(false);
    expect(store.load().progress).toEqual(p);
  });

  it('works in memory when there is no localStorage at all', () => {
    const store = createProgressStore(null);
    expect(store.available).toBe(false);
    expect(store.load(T0).progress).toEqual(emptyProgress(T0));
  });

  it('reports a failed write (quota) without throwing', () => {
    const backend = new FullStore();
    const store = createProgressStore(backend);
    backend.full = true;
    expect(store.save(toggle(emptyProgress(T0), 'eel', 'caught', T1))).toBe(false);
  });
});
