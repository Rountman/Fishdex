// Pure operations on a progress document. Every function returns a new object.
import { hasAny, migrate, type FishProgress, type FurnitureProgress, type Progress, type ProgressField } from './schema';

const NONE: FishProgress = { caught: false, caughtGlowing: false };
const NOT_OWNED: FurnitureProgress = { owned: false };

export const fishState = (p: Progress, id: string): FishProgress => p.fish[id] ?? NONE;
export const itemState = (p: Progress, id: string): FurnitureProgress => p.furniture[id] ?? NOT_OWNED;

function withFish(p: Progress, id: string, next: FishProgress, now: Date): Progress {
  const fish = { ...p.fish };
  if (hasAny(next)) fish[id] = next;
  else delete fish[id];
  return { ...p, updatedAt: now.toISOString(), fish };
}

/** Flips one state of one fish. `caughtAt` records the first catch and goes away when uncaught. */
export function toggle(p: Progress, id: string, field: ProgressField, now = new Date()): Progress {
  const cur = fishState(p, id);
  const next: FishProgress = { ...cur, [field]: !cur[field] };
  if (field === 'caught') {
    if (next.caught) next.caughtAt = cur.caughtAt ?? now.toISOString();
    else delete next.caughtAt;
  }
  if (field === 'bred' && !next.bred) delete next.bred;
  return withFish(p, id, next, now);
}

/** Restores one fish to an earlier state (undo). */
export const restore = (p: Progress, id: string, prev: FishProgress, now = new Date()): Progress =>
  withFish(p, id, { ...prev }, now);

function withItem(p: Progress, id: string, next: FurnitureProgress, now: Date): Progress {
  const furniture = { ...p.furniture };
  if (next.owned) furniture[id] = next;
  else delete furniture[id];
  return { ...p, updatedAt: now.toISOString(), furniture };
}

/** Flips "owned" of one furniture item; `ownedAt` keeps the first time. */
export function toggleOwned(p: Progress, id: string, now = new Date()): Progress {
  const cur = itemState(p, id);
  return withItem(p, id, cur.owned ? NOT_OWNED : { owned: true, ownedAt: cur.ownedAt ?? now.toISOString() }, now);
}

/** Restores one furniture item to an earlier state (undo). */
export const restoreItem = (p: Progress, id: string, prev: FurnitureProgress, now = new Date()): Progress =>
  withItem(p, id, { ...prev }, now);

const earliest = (a?: string, b?: string) => (!a ? b : !b ? a : Date.parse(a) <= Date.parse(b) ? a : b);

/** Import "Sloučit": keeps everything already checked and adds what the file has. Never unchecks. */
export function merge(current: Progress, incoming: Progress, now = new Date()): Progress {
  const fish: Record<string, FishProgress> = { ...current.fish };
  for (const [id, s] of Object.entries(incoming.fish)) {
    const c = current.fish[id] ?? NONE;
    const m: FishProgress = { caught: c.caught || s.caught, caughtGlowing: c.caughtGlowing || s.caughtGlowing };
    if (c.bred || s.bred) m.bred = true;
    if (m.caught) {
      const at = earliest(c.caught ? c.caughtAt : undefined, s.caught ? s.caughtAt : undefined);
      if (at) m.caughtAt = at;
    }
    fish[id] = m;
  }
  const furniture: Record<string, FurnitureProgress> = { ...current.furniture };
  for (const [id, s] of Object.entries(incoming.furniture)) {
    const at = earliest(current.furniture[id]?.ownedAt, s.ownedAt);
    furniture[id] = at ? { owned: true, ownedAt: at } : { owned: true };
  }
  return { ...current, updatedAt: now.toISOString(), fish, furniture };
}

/** Import "Nahradit": the file becomes the progress. */
export const replace = (incoming: Progress, now = new Date()): Progress =>
  ({ ...incoming, updatedAt: now.toISOString(), fish: { ...incoming.fish }, furniture: { ...incoming.furniture } });

export type ImportPreview = {
  progress: Progress;
  count: number;
  caught: number;
  caughtGlowing: number;
  bred: number;
  /** Ids the current data does not know; they are kept but not shown. */
  unknown: number;
  /** Owned furniture items, and how many of them the data does not know. */
  owned: number;
  unknownItems: number;
  savedAt: Date | null;
};

export type ImportResult = { ok: true; preview: ImportPreview } | { ok: false; reason: 'json' | 'invalid' | 'future' };

/** Reads a backup file's text and prepares the preview shown before Sloučit / Nahradit. */
export function readImport(text: string, knownIds: ReadonlySet<string>, knownItems: ReadonlySet<string> = new Set()): ImportResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: 'json' }; }
  const res = migrate(raw);
  if (!res.ok) return { ok: false, reason: res.reason };
  const entries = Object.entries(res.progress.fish);
  const n = (k: keyof FishProgress) => entries.filter(([, s]) => s[k] === true).length;
  const saved = Date.parse(res.progress.updatedAt);
  return {
    ok: true,
    preview: {
      progress: res.progress,
      count: entries.length,
      caught: n('caught'),
      caughtGlowing: n('caughtGlowing'),
      bred: n('bred'),
      unknown: entries.filter(([id]) => !knownIds.has(id)).length,
      owned: Object.keys(res.progress.furniture).length,
      unknownItems: Object.keys(res.progress.furniture).filter(id => !knownItems.has(id)).length,
      savedAt: saved > 0 ? new Date(saved) : null,
    },
  };
}

export const exportJson = (p: Progress) => JSON.stringify(p, null, 2) + '\n';

/** fishdex-progress-YYYY-MM-DD.json in the user's local date. */
export function exportFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `fishdex-progress-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type Totals = { caught: number; caughtGlowing: number; bred: number };

/** Counts only fish present in the data (unknown ids stay stored but are not counted). */
export function totals(p: Progress, ids: Iterable<string>): Totals {
  const t: Totals = { caught: 0, caughtGlowing: 0, bred: 0 };
  for (const id of ids) {
    const s = p.fish[id];
    if (!s) continue;
    if (s.caught) t.caught++;
    if (s.caughtGlowing) t.caughtGlowing++;
    if (s.bred) t.bred++;
  }
  return t;
}

/** Owned furniture items present in the data. */
export function ownedCount(p: Progress, ids: Iterable<string>): number {
  let n = 0;
  for (const id of ids) if (p.furniture[id]?.owned) n++;
  return n;
}
