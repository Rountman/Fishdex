import { describe, expect, it } from 'vitest';
import { AREAS, FISH } from '../data';
import { emptyProgress, type Progress } from '../progress/schema';
import { activeFilterCount, applyFilters, bitesAtHour, facets, locationPatch, EMPTY_FILTERS, inSeasonMonth, parseFilters, parseSort, serializeFilters, serializeSort, sortFish, type Filters } from './filters';
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

  it('spot shows only fish whose data names it, per area', () => {
    const raft = run({ spot: 'cool-mountain:Raft' });
    expect(raft).toHaveLength(19);
    expect(raft.every(f => f.spots['cool-mountain']?.includes('Raft'))).toBe(true);
    // Pyramid exists in two areas; the filter keeps them apart
    const pyramidPb = run({ spot: 'pinheira-beach:Pyramid' }), pyramidMd = run({ spot: 'mystic-desert:Pyramid' });
    expect(pyramidPb.length + pyramidMd.length).toBe(7);
    expect(ids(pyramidPb).some(id => ids(pyramidMd).includes(id))).toBe(false);
  });

  it('Mystic Desert alone leaves out the Pyramid and Furniture Factory fish', () => {
    const desert = run({ area: 'mystic-desert' });
    expect(desert.length).toBeGreaterThan(0);
    expect(desert.every(f => !f.spots['mystic-desert']?.length)).toBe(true);
    const all = FISH.filter(f => f.areas.includes('mystic-desert'));
    const inSpots = all.filter(f => f.spots['mystic-desert']?.length);
    expect(desert).toHaveLength(all.length - inSpots.length);
    expect(facets(FISH, EMPTY_FILTERS, emptyProgress(), index).areas.get('mystic-desert')?.total).toBe(desert.length);
  });

  it.each([
    ['cool-mountain', 'Raft', 11, 19, 10, 'arctic-char', 'common-carp'],
    ['pinheira-beach', 'Pier', 28, 44, 16, 'coelacanth', 'clownfish'],
    ['thombani-town', 'Enclosure', 9, 15, 6, 'electric-catfish', 'nile-perch'],
    ['seagull-harbor', 'Boat', 15, 38, 25, 'blue-marlin', 'dab'],
  ])('%s keeps %s-only fish apart, fish biting in both stay in both', (area, spot, open, atSpot, only, onlyFish, bothFish) => {
    const areaFish = ids(run({ area })), spotFish = ids(run({ spot: `${area}:${spot}` }));
    expect(areaFish).toHaveLength(open);
    expect(spotFish).toHaveLength(atSpot);
    expect(spotFish.filter(id => !areaFish.includes(id))).toHaveLength(only);
    expect(areaFish).not.toContain(onlyFish);
    expect(spotFish).toContain(onlyFish);
    expect(areaFish).toContain(bothFish);
    expect(spotFish).toContain(bothFish);
    expect(facets(FISH, EMPTY_FILTERS, emptyProgress(), index).areas.get(area)?.total).toBe(open);
  });

  it('Laketown leaves out the Trout Farm fish, they have no shared spot', () => {
    const town = ids(run({ area: 'laketown' })), farm = ids(run({ spot: 'laketown:Trout Farm' }));
    expect(town).toHaveLength(17);
    expect(farm).toHaveLength(6);
    expect(farm.some(id => town.includes(id))).toBe(false);
  });

  it.each([['palm-island', 'Inside', 38, 'Outside', 78], ['club', 'Salt Water Pond', 50, 'Fresh Water Pond', 31]])(
    '%s has no fish of its own, only spots, and is a heading', (area, a, nA, b, nB) => {
      expect(run({ area })).toHaveLength(0);
      expect(run({ spot: `${area}:${a}` })).toHaveLength(nA);
      expect(run({ spot: `${area}:${b}` })).toHaveLength(nB);
      expect(AREAS.find(x => x.id === area)!.open).toBe(false);
    });

  it('heading areas count each fish once, even one sitting at two spots', () => {
    const shared = FISH.find(f => f.spots['palm-island']?.length === 2)!;
    const p: Progress = { ...emptyProgress(), fish: { [shared.id]: { caught: true, caughtGlowing: false } } };
    const c = facets(FISH, EMPTY_FILTERS, p, index);
    expect(c.wholeAreas.get('palm-island')).toEqual({ total: 84, caught: 1, glow: 0, bred: 0 });
    expect(c.wholeAreas.get('club')?.total).toBe(80);
  });

  it('areas with fish outside their spots stay selectable', () => {
    expect(AREAS.filter(a => !a.open).map(a => a.id).sort()).toEqual(['club', 'palm-island']);
  });

  it('size keeps fish whose catch range touches the asked range', () => {
    const f = FISH.find(x => x.id === 'arctic-char')!; // 18–107 cm
    expect(f.size).toMatchObject({ min: 18, max: 107 });
    const has = (p: Partial<Filters>) => ids(run(p)).includes(f.id);
    expect(has({ sizeMin: 50, sizeMax: 60 })).toBe(true);    // inside
    expect(has({ sizeMin: 107 })).toBe(true);                // bounds included
    expect(has({ sizeMax: 18 })).toBe(true);
    expect(has({ sizeMin: 108 })).toBe(false);               // too big for it
    expect(has({ sizeMax: 17 })).toBe(false);                // too small for it
    expect(run({ sizeMin: 100, sizeMax: 50 })).toHaveLength(0);
    expect(facets(FISH, { ...EMPTY_FILTERS, sizeMin: 108 }, emptyProgress(), index).all.total).toBe(run({ sizeMin: 108 }).length);
  });

  it('picking a spot sets its area, picking an area clears the spot', () => {
    expect(locationPatch('cool-mountain:Raft')).toEqual({ area: 'cool-mountain', spot: 'cool-mountain:Raft', bred: '' });
    expect(locationPatch('club')).toEqual({ area: 'club', spot: '', bred: '' });
    expect(locationPatch('')).toEqual({ area: '', spot: '', bred: '' });
  });

  it('combines with search', () => {
    expect(ids(run({ q: 'stika', spot: 'club:Fresh Water Pond' }))).toContain('redfin-pickerel');
  });
});

describe('URL round trip', () => {
  it('serializes and parses back', () => {
    const f: Filters = {
      q: 'stika', area: 'backyard', spot: '', rarity: new Set([5, 4]), bait: new Set(['Fish', 'Insects']),
      status: 'uncaught', bred: 'no', hour: 22, month: 12, sizeMin: 10, sizeMax: 50,
    };
    const params = new URLSearchParams(Object.entries(serializeFilters(f)).filter(([, v]) => v) as [string, string][]);
    expect(params.toString()).toBe('q=stika&area=backyard&rarity=4%2C5&bait=Fish%2CInsects&status=uncaught&bred=no&hour=22&month=12&sizemin=10&sizemax=50');
    const withSpot = parseFilters(new URLSearchParams('spot=laketown:Trout Farm'), areaIds);
    expect(withSpot.spot).toBe('laketown:Trout Farm');
    expect(serializeFilters(withSpot).spot).toBe('laketown:Trout Farm');
    expect(parseFilters(params, areaIds)).toEqual(f);
    expect(activeFilterCount(f)).toBe(10);
  });

  it('old links to a heading area fall back to all areas, its spots keep working', () => {
    const headings = new Set(['club']);
    expect(parseFilters(new URLSearchParams('area=club&rarity=5'), areaIds, headings)).toEqual({ ...EMPTY_FILTERS, rarity: new Set([5]) });
    const spot = parseFilters(new URLSearchParams('area=club&spot=club:Salt Water Pond'), areaIds, headings);
    expect(spot).toMatchObject({ area: 'club', spot: 'club:Salt Water Pond' });
  });

  it('ignores junk instead of guessing', () => {
    const f = parseFilters(new URLSearchParams('area=atlantis&spot=club:Lava&rarity=0,7,x,3&bait=Worms,Fish&status=maybe&bred=yes&hour=24&month=0&sizemin=x&sizemax=-1'), areaIds);
    expect(f).toEqual({ ...EMPTY_FILTERS, rarity: new Set([3]), bait: new Set(['Fish']) });
  });

  it('empty filters produce no query keys', () => {
    expect(Object.values(serializeFilters(EMPTY_FILTERS)).every(v => v === null)).toBe(true);
  });
});

describe('facets (counts next to filter options)', () => {
  const p: Progress = { ...emptyProgress(), fish: { eel: { caught: true, caughtGlowing: true }, 'arctic-char': { caught: true, caughtGlowing: false } } };
  const fx = (f: Partial<Filters>) => facets(FISH, { ...EMPTY_FILTERS, ...f }, p, index);

  it('without filters they are the plain data counts', () => {
    const c = fx({});
    expect(c.all.total).toBe(FISH.length);
    expect(c.areas.get('pirate-cave')?.total).toBe(7);
    expect(c.spots.get('cool-mountain:Raft')).toEqual({ total: 19, caught: 1, glow: 0, bred: 0 });
    expect(c.bait.get('Insects')).toBe(337);
    expect([1, 2, 3, 4, 5].map(r => c.rarity.get(r))).toEqual([48, 102, 153, 150, 162]);
    expect(c.status).toEqual({ all: FISH.length, uncaught: FISH.length - 2, caught: 2, noglow: FISH.length - 1 });
  });

  it('each group follows the other filters but ignores its own', () => {
    const c = fx({ rarity: new Set([5]), area: 'aquayama' });
    // areas: only 5-star fish, area selection itself ignored
    expect(c.all.total).toBe(162);
    expect(c.areas.get('aquayama')?.total).toBe(run({ rarity: new Set([5]), area: 'aquayama' }).length);
    // rarity: only area fish, rarity selection itself ignored
    expect([1, 2, 3, 4, 5].reduce((n, r) => n + (c.rarity.get(r) ?? 0), 0)).toBe(AREAS.find(a => a.id === 'aquayama')!.count);
    // bait: area + 5-star
    expect(c.bait.get('Fish')).toBe(run({ rarity: new Set([5]), area: 'aquayama', bait: new Set(['Fish']) }).length);
  });
});

describe('sort', () => {
  const sample = FISH.filter(f => ['arapaima', 'eel', 'asp', 'pike', 'carp'].includes(f.id));

  it('defaults to rarity (1★ first), then by name', () => {
    const out = sortFish(FISH, 'rarity', 'cs');
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i];
      expect(a.rarity <= b.rarity).toBe(true);
      if (a.rarity === b.rarity) expect(a.names.cs.localeCompare(b.names.cs, 'cs', { sensitivity: 'base', numeric: true }) <= 0).toBe(true);
    }
  });

  it('sorts by name in the page language with its alphabet', () => {
    expect(sortFish(sample, 'name', 'en').map(f => f.names.en)).toEqual([...sample.map(f => f.names.en)].sort((a, b) => a.localeCompare(b, 'en')));
    const fake = (cs: string) => ({ ...FISH[0], id: cs, names: { cs, en: cs } });
    // Czech: "ch" comes after "h"
    expect(sortFish([fake('Chrostík'), fake('Hrouzek'), fake('Candát')], 'name', 'cs').map(f => f.id)).toEqual(['Candát', 'Hrouzek', 'Chrostík']);
  });

  it('keeps the order out of the URL when it is the default', () => {
    expect(parseSort(new URLSearchParams(''))).toBe('rarity');
    expect(parseSort(new URLSearchParams('sort=name'))).toBe('name');
    expect(parseSort(new URLSearchParams('sort=x'))).toBe('rarity');
    expect(serializeSort('rarity')).toBeNull();
  });

  it('does not mutate the input', () => {
    const before = FISH.map(f => f.id);
    sortFish(FISH, 'name', 'cs');
    expect(FISH.map(f => f.id)).toEqual(before);
  });
});
