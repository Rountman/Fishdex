// Fuzzy search over Czech and English names, without diacritics.
import type { Fish } from '../data/types';

export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** true when a and b differ by at most one insertion, deletion or substitution */
export function nearlyEqual(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const words = (s: string) => fold(s).split(/[\s\-–,.()']+/).filter(Boolean);

export type SearchIndex = Map<string, { joined: string; tokens: string[] }>;

/** Precomputes folded names once (615 fish × every keystroke). */
export function buildIndex(fish: readonly Fish[]): SearchIndex {
  return new Map(fish.map(f => {
    const tokens = [...words(f.names.cs), ...words(f.names.en)];
    return [f.id, { joined: `${fold(f.names.cs)} | ${fold(f.names.en)}`, tokens }];
  }));
}

/**
 * Every query word must appear in the cs or en name as a substring, or – for
 * words of 4+ letters – match a name word (or its start) within one typo.
 */
export function matches(index: SearchIndex, id: string, query: string): boolean {
  const q = words(query);
  if (!q.length) return true;
  const entry = index.get(id);
  if (!entry) return false;
  return q.every(w => entry.joined.includes(w) ||
    (w.length >= 4 && entry.tokens.some(tok => nearlyEqual(w, tok) || nearlyEqual(w, tok.slice(0, w.length)))));
}
