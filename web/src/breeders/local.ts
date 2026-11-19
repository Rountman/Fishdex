// Chovatelé: what this browser remembers (session token, what was last sent) and the pure
// logic around the register. Same storage rules as progress: every access guarded.
import type { Progress } from '../progress/schema';
import { browserStorage } from '../progress/storage';
import type { Entry, Me } from './api';

/** Bearer token from the Discord login. Never exported with the progress backup. */
export const SESSION_KEY = 'fishdex:session:v1';
/** { version, owner, sent }: the fish list last confirmed by the server for `owner` (Discord id). */
export const BREEDERS_KEY = 'fishdex:breeders:v1';

export type SyncMemory = { owner: string; sent: string[] };

export function loadSession(): string | null {
  try {
    const raw = browserStorage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { version?: number; token?: unknown };
    return v.version === 1 && typeof v.token === 'string' ? v.token : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string | null) {
  try {
    const s = browserStorage();
    if (token) s?.setItem(SESSION_KEY, JSON.stringify({ version: 1, token }));
    else s?.removeItem(SESSION_KEY);
  } catch { /* works for this visit only */ }
}

export function loadMemory(): SyncMemory | null {
  try {
    const raw = browserStorage()?.getItem(BREEDERS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { version?: number; owner?: unknown; sent?: unknown };
    if (v.version !== 1 || typeof v.owner !== 'string' || !Array.isArray(v.sent)) return null;
    return { owner: v.owner, sent: v.sent.filter((x): x is string => typeof x === 'string') };
  } catch {
    return null;
  }
}

export function saveMemory(m: SyncMemory | null) {
  try {
    const s = browserStorage();
    if (m) s?.setItem(BREEDERS_KEY, JSON.stringify({ version: 1, ...m }));
    else s?.removeItem(BREEDERS_KEY);
  } catch { /* works for this visit only */ }
}

/** Backyard fish marked "mám za domem", sorted (the shape the server stores). */
export function bredIds(p: Progress, backyard: ReadonlySet<string>): string[] {
  return Object.entries(p.fish).filter(([id, s]) => s.bred && backyard.has(id)).map(([id]) => id).sort();
}

export const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export type SyncPlan =
  | { kind: 'off' }                                         // not logged in, nothing published, or banned
  | { kind: 'synced' }                                      // the register matches this journal
  | { kind: 'send'; fish: string[] }                        // this journal changed since the last sync: send it
  | { kind: 'conflict'; server: string[]; local: string[] }; // both changed (another device): ask, never overwrite

/**
 * Auto-sync decision. Local changes are sent only when the register still holds what this browser
 * last sent; otherwise (first login on a new device, edits elsewhere) the user picks a side.
 */
export function planSync(me: Me | null, memory: SyncMemory | null, local: readonly string[]): SyncPlan {
  if (!me?.entry || me.banned) return { kind: 'off' };
  const server = me.entry.fish;
  if (sameList(server, local)) return { kind: 'synced' };
  if (memory?.owner === me.id && sameList(memory.sent, server)) return { kind: 'send', fish: [...local] };
  return { kind: 'conflict', server, local: [...local] };
}

/** `#session=…` / `#auth_error=…` left by the login redirect. */
export function readAuthFragment(hash: string): { session: string } | { error: 'denied' | 'failed' } | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const s = p.get('session');
  if (s && /^[\w-]{20,100}$/.test(s)) return { session: s };
  const e = p.get('auth_error');
  if (e) return { error: e === 'denied' ? 'denied' : 'failed' };
  return null;
}

/** How many entries list each fish. */
export function breederCounts(entries: readonly Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) for (const id of e.fish) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** Register order: most backyard fish first, then by entry number. */
export const sortEntries = (entries: readonly Entry[]): Entry[] =>
  [...entries].sort((a, b) => b.fish.length - a.fish.length || a.no - b.no);
