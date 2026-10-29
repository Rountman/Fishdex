import { describe, expect, it } from 'vitest';
import { AREAS, FISH } from '../data';
import { emptyProgress, type Progress } from '../progress/schema';
import { activeFilterCount, applyFilters, bitesAtHour, EMPTY_FILTERS, inSeasonMonth, parseFilters, serializeFilters, type Filters } from './filters';
import { buildIndex, fold, matches, nearlyEqual } from './search';

const index = buildIndex(FISH);
const areaIds = new Set(AREAS.map(a => a.id));
const ids = (list: { id: string }[]) => list.map(f => f.id);
const run = (f: Partial<Filters>, p: Progress = emptyProgress()) => applyFilters(FISH, { ...EMPTY_FILTERS, ...f }, p, index);

describe('search', () => {
  it('folds diacritics', () => expect(fold('Štika červenoploutvá')).toBe('stika cervenoploutva'));

  it('finds Czech names without diacritics', () => {
    expect(ids(FISH.filter(f => matches(index, f.id, 'stika americka')))).toContain('redfin-pickerel');
  });

  it('finds English names', () => {
    expect(ids(FISH.filter(f => matches(index, f.id, 'shovelnose')))).toEqual(['spotted-tiger-shovelnose-catfish']);
  });

  it('tolerates one typo in longer words', () => {
    expect(nearlyEqual('arapaim', 'arapaima')).toBe(true);
    expect(matches(index, 'arapaima', 'arapiama')).toBe(false); // two edits
    expect(matches(index, 'arapaima', 'arapama')).toBe(true);
  });

  it('returns nothing for words that are not in any name', () => {
    expect(FISH.filter(f => matches(index, f.id, 'delfin'))).toEqual([]);
  });

  it('empty query matches everything', () => expect(matches(index, 'eel', '  ')).toBe(true));
});

describe('time and season', () => {
  it('handles plain, overnight and until-midnight windows', () => {
    const day = [{ from: '05:00', to: '11:00' }];
    expect(bitesAtHour(day, 5)).toBe(true);
    expect(bitesAtHour(day, 10)).toBe(true);
    expect(bitesAtHour(day, 11)).toBe(false);
    const night = [{ from: '22:00', to: '04:00' }];
    expect(bitesAtHour(night, 23)).toBe(true);
    expect(bitesAtHour(night, 2)).toBe(true);
    expect(bitesAtHour(night, 12)).toBe(false);
    expect(bitesAtHour([{ from: '18:00', to: '00:00' }], 23)).toBe(true);
    expect(bitesAtHour([{ from: '18:00', to: '00:00' }], 0)).toBe(false);
  });

  it('treats always as yes and unknown as no', () => {
    expect(bitesAtHour('always', 3)).toBe(true);
    expect(bitesAtHour(null, 3)).toBe(false);
    expect(inSeasonMonth('always', 2)).toBe(true);
    expect(inSeasonMonth(null, 2)).toBe(false);
  });

  it('handles seasons over New Year', () => {
    const winter = [{ from: '12-01', to: '01-31' }];
    expect(inSeasonMonth(winter, 12)).toBe(true);
    expect(inSeasonMonth(winter, 1)).toBe(true);
    expect(inSeasonMonth(winter, 2)).toBe(false);
    expect(inSeasonMonth([{ from: '07-01', to: '09-30' }], 9)).toBe(true);
    expect(inSeasonMonth([{ from: '07-01', to: '09-30' }], 10)).toBe(false);
  });
});

describe('applyFilters', () => {
  it('no filters = all 615 fish', () => expect(run({})).toHaveLength(FISH.length));

  it('area', () => {
    expect(run({ area: 'pirate-cave' })).toHaveLength(AREAS.find(a => a.id === 'pirate-cave')!.count);
  });

  it('bait is OR across the selection', () => {
    const shark = run({ bait: new Set(['Shark Bait']) });
    const both = run({ bait: new Set(['Shark Bait', 'Monster Bait']) });
    expect(both.length).toBeGreaterThan(shark.length);
    expect(both.every(f => f.bait.includes('Shark Bait') || f.bait.includes('Monster Bait'))).toBe(true);
  });

  it('status uses progress', () => {
    const p: Progress = { ...emptyProgress(), fish: { eel: { caught: true, caughtGlowing: false }, asp: { caught: false, caughtGlowing: true } } };
    expect(ids(run({ status: 'caught' }, p))).toEqual(['eel']);
    expect(run({ status: 'uncaught' }, p)).toHaveLength(FISH.length - 1);
    expect(ids(run({ status: 'noglow' }, p))).not.toContain('asp');
  });

  it('backyard "mám za domem" only applies with the Backyard area', () => {
    const p: Progress = { ...emptyProgress(), fish: { 'fire-eel': { caught: false, caughtGlowing: false, bred: true } } };
    expect(ids(run({ area: 'backyard', bred: 'yes' }, p))).toEqual(['fire-eel']);
    expect(run({ area: '', bred: 'yes' }, p)).toHaveLength(FISH.length);
  });

  it('hour filter hides unknown times', () => {
    const atNoon = run({ hour: 12 });
    expect(ids(atNoon)).not.toContain('flathead-catfish'); // time: null
    expect(atNoon.length).toBeLessThan(FISH.length);
  });

  it('combines with search', () => {
    expect(ids(run({ q: 'stika', area: 'club' }))).toContain('redfin-pickerel');
  });
});

describe('URL round trip', () => {
  it('serializes and parses back', () => {
    const f: Filters = {
      q: 'stika', area: 'backyard', rarity: new Set([5, 4]), bait: new Set(['Fish', 'Insects']),
      status: 'uncaught', bred: 'no', hour: 22, month: 12,
    };
    const params = new URLSearchParams(Object.entries(serializeFilters(f)).filter(([, v]) => v) as [string, string][]);
    expect(params.toString()).toBe('q=stika&area=backyard&rarity=4%2C5&bait=Fish%2CInsects&status=uncaught&bred=no&hour=22&month=12');
    expect(parseFilters(params, areaIds)).toEqual(f);
    expect(activeFilterCount(f)).toBe(9);
  });

  it('ignores junk instead of guessing', () => {
    const f = parseFilters(new URLSearchParams('area=atlantis&rarity=0,7,x,3&bait=Worms,Fish&status=maybe&bred=yes&hour=24&month=0'), areaIds);
    expect(f).toEqual({ ...EMPTY_FILTERS, rarity: new Set([3]), bait: new Set(['Fish']) });
  });

  it('empty filters produce no query keys', () => {
    expect(Object.values(serializeFilters(EMPTY_FILTERS)).every(v => v === null)).toBe(true);
  });
});
