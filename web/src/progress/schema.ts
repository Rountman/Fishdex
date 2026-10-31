// Progress document stored in localStorage and in backup files.
// CLAUDE.md: `fishdex:progress:v2` → { version, updatedAt, fish: { [id]: { caught, caughtGlowing, bred?, caughtAt? } },
//                                     furniture: { [id]: { owned, ownedAt? } } }
// v1 had no `furniture`.

export const SCHEMA_VERSION = 2;
export const keyFor = (version: number) => `fishdex:progress:v${version}`;
export const STORAGE_KEY = keyFor(SCHEMA_VERSION);

export type FishProgress = {
  caught: boolean;
  caughtGlowing: boolean;
  /** "Mám za domem" – only for Backyard fish. */
  bred?: boolean;
  /** ISO date-time of the first time the fish was marked caught. */
  caughtAt?: string;
};

export type FurnitureProgress = {
  owned: boolean;
  /** ISO date-time of the first time the item was marked owned. */
  ownedAt?: string;
};

export type Progress = {
  version: typeof SCHEMA_VERSION;
  updatedAt: string;
  /** Only fish with at least one `true`. Ids not in the data are kept, just not shown. */
  fish: Record<string, FishProgress>;
  /** Only owned items. Same rule for unknown ids. */
  furniture: Record<string, FurnitureProgress>;
};

export type ProgressField = 'caught' | 'caughtGlowing' | 'bred';

export const emptyProgress = (now = new Date()): Progress => ({
  version: SCHEMA_VERSION,
  updatedAt: now.toISOString(),
  fish: {},
  furniture: {},
});

/**
 * Upgrades a document of version n to n + 1. Add an entry whenever the schema
 * changes; never drop user data on the way.
 */
export type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Record<number, Migration> = {
  // v2 adds the furniture collection; fish entries are unchanged
  1: doc => ({ ...doc, furniture: {} }),
};

export type MigrateResult =
  | { ok: true; progress: Progress; migratedFrom: number | null }
  | { ok: false; reason: 'invalid' | 'future'; version?: number };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const hasAny = (s: FishProgress) => s.caught || s.caughtGlowing || s.bred === true;

/** Keeps only well-formed entries with at least one `true`. */
function normalizeFish(raw: Record<string, unknown>): Record<string, FishProgress> {
  const out: Record<string, FishProgress> = {};
  for (const [id, v] of Object.entries(raw)) {
    if (!isRecord(v)) continue;
    const s: FishProgress = { caught: v.caught === true, caughtGlowing: v.caughtGlowing === true };
    if (v.bred === true) s.bred = true;
    if (s.caught && typeof v.caughtAt === 'string' && !Number.isNaN(Date.parse(v.caughtAt))) s.caughtAt = v.caughtAt;
    if (hasAny(s)) out[id] = s;
  }
  return out;
}

function normalizeFurniture(raw: unknown): Record<string, FurnitureProgress> {
  const out: Record<string, FurnitureProgress> = {};
  if (!isRecord(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (!isRecord(v) || v.owned !== true) continue;
    out[id] = { owned: true };
    if (typeof v.ownedAt === 'string' && !Number.isNaN(Date.parse(v.ownedAt))) out[id].ownedAt = v.ownedAt;
  }
  return out;
}

/** Validates any stored or imported value and migrates it to the current schema. */
export function migrate(raw: unknown, migrations: Record<number, Migration> = MIGRATIONS): MigrateResult {
  if (!isRecord(raw) || typeof raw.version !== 'number' || !Number.isInteger(raw.version)) return { ok: false, reason: 'invalid' };
  const from = raw.version;
  if (from > SCHEMA_VERSION) return { ok: false, reason: 'future', version: from };
  let doc: Record<string, unknown> = raw;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, reason: 'invalid', version: from };
    doc = { ...step(doc), version: v + 1 };
  }
  if (!isRecord(doc.fish)) return { ok: false, reason: 'invalid', version: from };
  const updatedAt = typeof doc.updatedAt === 'string' && !Number.isNaN(Date.parse(doc.updatedAt))
    ? doc.updatedAt : new Date(0).toISOString();
  return {
    ok: true,
    progress: { version: SCHEMA_VERSION, updatedAt, fish: normalizeFish(doc.fish), furniture: normalizeFurniture(doc.furniture) },
    migratedFrom: from === SCHEMA_VERSION ? null : from,
  };
}
