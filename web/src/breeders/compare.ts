// Comparing my journal with another player's: pure logic. My side is always the local progress,
// the other side is what that player published.
import type { Area, Fish } from '../data/types';
import { emptyProgress, type Progress } from '../progress/schema';
import type { Facets, Tally } from '../state/filters';
import type { Catches } from './api';

/** What is compared: caught, glowing, or backyard fish ("mám za domem"). */
export const WHATS = ['caught', 'glow', 'bred'] as const;
export type What = typeof WHATS[number];
const FIELD = { caught: 'caught', glow: 'caughtGlowing', bred: 'bred' } as const;

/** The player's published lists as a journal, so the same counting runs on both sides. */
export function journalOf(bred: readonly string[], catches: Catches | null): Progress {
  const p = emptyProgress(new Date(0));
  const at = (id: string) => (p.fish[id] ??= { caught: false, caughtGlowing: false });
  for (const id of catches?.caught ?? []) at(id).caught = true;
  for (const id of catches?.glowing ?? []) at(id).caughtGlowing = true;
  for (const id of bred) at(id).bred = true;
  return p;
}

export type Split = { mine: Fish[]; theirs: Fish[]; both: Fish[]; none: Fish[] };

/** Sorts fish into "only me / only them / both / nobody", keeping their order. */
export function split(fish: readonly Fish[], mine: Progress, theirs: Progress, what: What): Split {
  const out: Split = { mine: [], theirs: [], both: [], none: [] };
  const field = FIELD[what];
  for (const f of fish) {
    const a = mine.fish[f.id]?.[field] === true, b = theirs.fish[f.id]?.[field] === true;
    out[a ? (b ? 'both' : 'mine') : b ? 'theirs' : 'none'].push(f);
  }
  return out;
}

export type Score = { key: string; me: number; them: number; total: number };
export type AreaScore = Score & { area: Area; spots: (Score & { spot: Area['spots'][number] })[] };

/** Score of every area with fish and of its spots; keys are what the area filter takes. */
export function areaScores(areas: readonly Area[], mine: Facets, theirs: Facets, what: What): AreaScore[] {
  const score = (key: string, a: Tally | undefined, b: Tally | undefined): Score =>
    ({ key, me: a?.[what] ?? 0, them: b?.[what] ?? 0, total: a?.total ?? 0 });
  return areas.map(area => ({
    ...score(area.id, mine.areas.get(area.id), theirs.areas.get(area.id)), area,
    spots: area.spots.map(spot => {
      const key = `${area.id}:${spot}`;
      return { ...score(key, mine.spots.get(key), theirs.spots.get(key)), spot };
    }),
  })).filter(s => s.total > 0);
}

/** How many areas each side leads in. */
export function standings(scores: readonly Score[]) {
  const won = scores.filter(s => s.me > s.them).length;
  const lost = scores.filter(s => s.me < s.them).length;
  return { won, lost, tied: scores.length - won - lost };
}
