// Input rules for the register. Shared with the web app (it imports this file for the form).

export const NICK_MIN = 3;
export const NICK_MAX = 20;
// letters (any script), digits, _ . - ; single spaces only between words
const NICK_RE = /^[\p{L}\p{N}_.-]+(?: [\p{L}\p{N}_.-]+)*$/u;

/** Normalised nickname, or null when it breaks the rules. */
export function cleanNick(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  const len = [...s].length;
  if (len < NICK_MIN || len > NICK_MAX) return null;
  return NICK_RE.test(s) ? s : null;
}

/** Uniqueness ignores case. */
export const nickKey = (nick: string) => nick.toLowerCase();

/** Unique sorted ids, or null when anything is not a backyard fish. */
export function cleanFish(raw: unknown, allowed: ReadonlySet<string>): string[] | null {
  if (!Array.isArray(raw) || raw.length > allowed.size * 2) return null;
  const out = new Set<string>();
  for (const id of raw) {
    if (typeof id !== 'string' || !allowed.has(id)) return null;
    out.add(id);
  }
  return [...out].sort();
}
