import { describe, expect, it } from 'vitest';
import { AREAS, FISH, isBackyard } from '../data';
import { emptyProgress, SCHEMA_VERSION, type Progress } from '../progress/schema';
import { applyFilters, EMPTY_FILTERS, facets, locationPatch } from '../state/filters';
import { buildIndex } from '../state/search';
import { areaScores, journalOf, split, standings } from './compare';

const INDEX = buildIndex(FISH);
const doc = (fish: Progress['fish']): Progress => ({ version: SCHEMA_VERSION, updatedAt: '2026-11-24T10:00:00Z', fish, furniture: {} });
const [A, B, C, D] = FISH.filter(f => !isBackyard(f)).map(f => f.id);
const caught = { caught: true, caughtGlowing: false };
const ids = (list: { id: string }[]) => list.map(f => f.id);

describe('journalOf', () => {
  it('turns published lists into a journal', () => {
    expect(journalOf([B], { caught: [A, B], glowing: [A] }).fish).toEqual({
      [A]: { caught: true, caughtGlowing: true },
      [B]: { caught: true, caughtGlowing: false, bred: true },
    });
    expect(journalOf([], null).fish).toEqual({});
  });
});

describe('split', () => {
  const four = FISH.filter(f => [A, B, C, D].includes(f.id));
  it('puts every fish into exactly one of four groups', () => {
    const s = split(four, doc({ [A]: caught, [B]: caught }), journalOf([], { caught: [B, C], glowing: [] }), 'caught');
    expect([ids(s.mine), ids(s.both), ids(s.theirs), ids(s.none)]).toEqual([[A], [B], [C], [D]]);
  });
  it('compares glowing and backyard fish on their own', () => {
    const mine = doc({ [A]: { caught: true, caughtGlowing: true }, [B]: { ...caught, bred: true } });
    const theirs = journalOf([B, C], { caught: [A], glowing: [D] });
    expect(ids(split(four, mine, theirs, 'glow').mine)).toEqual([A]);
    expect(ids(split(four, mine, theirs, 'glow').theirs)).toEqual([D]);
    expect(ids(split(four, mine, theirs, 'bred').both)).toEqual([B]);
    expect(ids(split(four, mine, theirs, 'bred').theirs)).toEqual([C]);
  });
  it('handles two empty and two complete journals', () => {
    const all = journalOf([], { caught: FISH.map(f => f.id), glowing: [] });
    expect(split(FISH, emptyProgress(), emptyProgress(), 'caught').none).toHaveLength(FISH.length);
    expect(split(FISH, all, all, 'caught').both).toHaveLength(FISH.length);
  });
});

describe('areaScores', () => {
  const mine = doc(Object.fromEntries(FISH.filter((_, i) => i % 3 === 0).map(f => [f.id, { caught: true, caughtGlowing: true }])));
  const theirs = journalOf([], { caught: FISH.filter((_, i) => i % 2 === 0).map(f => f.id), glowing: [] });
  const f = (p: Progress) => facets(FISH, EMPTY_FILTERS, p, INDEX);
  const scores = areaScores(AREAS, f(mine), f(theirs), 'caught');

  it('covers every area that has fish, and all their spots', () => {
    const withFish = AREAS.filter(a => f(mine).areas.get(a.id)?.total);
    expect(scores.map(s => s.key)).toEqual(withFish.map(a => a.id));
    expect(scores.flatMap(s => s.spots.map(x => x.key))).toEqual(withFish.flatMap(a => a.spots.map(sp => `${a.id}:${sp}`)));
  });

  it('agrees with the fish shown after picking that area or spot', () => {
    for (const s of scores.flatMap(a => [a, ...a.spots])) {
      const pool = applyFilters(FISH, { ...EMPTY_FILTERS, ...locationPatch(s.key) }, mine, INDEX);
      const x = split(pool, mine, theirs, 'caught');
      expect([s.key, s.total, s.me, s.them]).toEqual([s.key, pool.length, x.mine.length + x.both.length, x.theirs.length + x.both.length]);
    }
  });

  it('counts who leads where', () => {
    const s = (me: number, them: number) => ({ key: '', me, them, total: 9 });
    expect(standings([s(3, 1), s(0, 2), s(1, 2), s(4, 4)])).toEqual({ won: 1, lost: 2, tied: 1 });
  });
});
