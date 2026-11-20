import { describe, expect, it } from 'vitest';
import { AREAS, FISH } from '../data';
import { ZONED_AREAS } from '../data/types';
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

  it('club "odemčeno" only applies with the Club area', () => {
    const p: Progress = { ...emptyProgress(), fish: { 'achilles-tang': { caught: false, caughtGlowing: false, unlocked: true } } };
    const club = FISH.filter(f => f.areas.includes('club'));
    expect(ids(run({ area: 'club', unlocked: 'yes' }, p))).toEqual(['achilles-tang']);
    expect(run({ area: 'club', unlocked: 'no' }, p)).toHaveLength(club.length - 1);
    expect(run({ area: '', unlocked: 'yes' }, p)).toHaveLength(FISH.length);
    expect(facets(FISH, { ...EMPTY_FILTERS }, p, index).areas.get('club')?.unlocked).toBe(1);
  });

  it('"odemčeno" lives in the URL only with the Club area', () => {
    expect(parseFilters(new URLSearchParams('area=club&unl=no'), areaIds).unlocked).toBe('no');
    expect(parseFilters(new URLSearchParams('area=laketown&unl=yes'), areaIds).unlocked).toBe('');
    expect(parseFilters(new URLSearchParams('area=club&unl=maybe'), areaIds).unlocked).toBe('');
    expect(serializeFilters({ ...EMPTY_FILTERS, area: 'club', unlocked: 'yes' }).unl).toBe('yes');
    expect(serializeFilters({ ...EMPTY_FILTERS, area: 'backyard', unlocked: 'yes' }).unl).toBeNull();
    expect(activeFilterCount({ ...EMPTY_FILTERS, area: 'club', unlocked: 'yes' })).toBe(2);
    expect(locationPatch('club').unlocked).toBe('');
  });

  it('hour filter hides unknown times', () => {
    const atNoon = run({ hour: 12 });
    expect(ids(atNoon)).not.toContain('flathead-catfish'); // time: null
    expect(atNoon.length).toBeLessThan(FISH.length);
  });

  it('spot shows only fish whose data names it, per area', () => {
    const raft = run({ spot: 'cool-mountain:Raft' });
    expect(raft).toHaveLength(10);
    expect(raft.every(f => f.spots['cool-mountain']?.includes('Raft'))).toBe(true);
    // the Pyramid is in Mystic Desert only; Pinheira Beach has none, giant moray bites at the pier
    expect(run({ spot: 'mystic-desert:Pyramid' })).toHaveLength(4);
    expect(AREAS.find(a => a.id === 'pinheira-beach')!.spots).toEqual(['Pier']);
    expect(FISH.find(f => f.id === 'giant-moray')!.spots).toEqual({ 'pinheira-beach': ['Pier'] });
  });

  it('Mystic Desert alone leaves out the Pyramid and Furniture Factory fish', () => {
    const desert = run({ area: 'mystic-desert' });
    expect(desert).toHaveLength(11);
    expect(desert.every(f => !f.spots['mystic-desert']?.length)).toBe(true);
    expect(facets(FISH, EMPTY_FILTERS, emptyProgress(), index).areas.get('mystic-desert')?.total).toBe(11);
  });

  // fishao.net: a fish with a place bites only there, so an area and its spot never share a fish
  it.each([
    ['cool-mountain', 'Raft', 11, 10, 'arctic-char', 'common-carp'],
    ['pinheira-beach', 'Pier', 26, 18, 'coelacanth', 'clownfish'],
    ['thombani-town', 'Enclosure', 9, 6, 'electric-catfish', 'nile-perch'],
    ['seagull-harbor', 'Boat', 14, 26, 'blue-marlin', 'dab'],
    ['laketown', 'Trout Farm', 17, 6, 'rainbow-trout', 'pike'],
  ])('%s and its %s split the area\'s fish', (area, spot, open, atSpot, spotFish, openFish) => {
    const areaIds = ids(run({ area })), spotIds = ids(run({ spot: `${area}:${spot}` }));
    expect(areaIds).toHaveLength(open);
    expect(spotIds).toHaveLength(atSpot);
    expect(spotIds.some(id => areaIds.includes(id))).toBe(false);
    expect(open + atSpot).toBe(FISH.filter(f => f.areas.includes(area)).length);
    expect(spotIds).toContain(spotFish);
    expect(areaIds).toContain(openFish);
    expect(facets(FISH, EMPTY_FILTERS, emptyProgress(), index).areas.get(area)?.total).toBe(open);
  });

  it('fish moved by the official wiki: mackerel on the boat only, bramble shark on the pier only', () => {
    expect(ids(run({ spot: 'seagull-harbor:Boat' }))).toContain('atlantic-mackerel');
    expect(ids(run({ area: 'seagull-harbor' }))).not.toContain('atlantic-mackerel');
    expect(ids(run({ area: 'pinheira-beach' }))).not.toContain('bramble-shark');
    expect(ids(run({ area: 'seagull-harbor' }))).toContain('dab');
  });

  it.each([['palm-island', 'Zone A', 39, 'Zone E', 38, 84], ['club', 'Salt Water Pond', 49, 'Fresh Water Pond', 31, 80]])(
    '%s is nothing but spots: picking it shows every fish of all its spots once', (area, a, nA, b, nB, all) => {
      expect(run({ area })).toHaveLength(all);
      expect(run({ spot: `${area}:${a}` })).toHaveLength(nA);
      expect(run({ spot: `${area}:${b}` })).toHaveLength(nB);
      expect(AREAS.find(x => x.id === area)!.open).toBe(false);
    });

  it('the Club has no Monster Pond, monster fish bite in the salt water pond', () => {
    expect(AREAS.find(a => a.id === 'club')!.spots).toEqual(['Salt Water Pond', 'Fresh Water Pond']);
    expect(FISH.find(f => f.id === 'greenland-shark')!.spots).toEqual({ club: ['Salt Water Pond'] });
  });

  it('heading areas count each fish once, even one sitting at several zones', () => {
    const shared = FISH.find(f => f.spots['palm-island']?.length === 8)!;
    const p: Progress = { ...emptyProgress(), fish: { [shared.id]: { caught: true, caughtGlowing: false } } };
    const c = facets(FISH, EMPTY_FILTERS, p, index);
    expect(c.areas.get('palm-island')).toEqual({ total: 84, caught: 1, glow: 0, bred: 0, unlocked: 0 });
    expect(c.spots.get('palm-island:Zone H')).toMatchObject({ total: 33, caught: 1 });
    expect(c.areas.get('club')?.total).toBe(80);
  });

  it('areas with fish outside their spots stay selectable', () => {
    expect(AREAS.filter(a => !a.open).map(a => a.id).sort()).toEqual(['club', 'moray-tournament', 'palm-island']);
  });

  it.each([
    ['palm-island:Zone E', 38, 6],       // the other 32 bite in other zones too
    ['palm-island:Zone H', 33, 6],
    ['moray-tournament:Zone D', 7, 1],   // only the zebra moray
    ['seagull-harbor:Boat', 26, 26],
    ['club:Fresh Water Pond', 31, 31],
  ])('"only here" at %s: %i → %i fish', (spot, all, only) => {
    expect(run({ spot })).toHaveLength(all);
    expect(run({ spot, spotOnly: true })).toHaveLength(only);
    expect(facets(FISH, { ...EMPTY_FILTERS, spot, area: spot.split(':')[0] }, emptyProgress(), index).spotOnly).toBe(only);
  });

  it('"only here" ignores other areas: the Trout Farm rainbow trout also bites at Cool Mountain', () => {
    expect(ids(run({ spot: 'laketown:Trout Farm', spotOnly: true }))).toContain('rainbow-trout');
  });

  it('Palm Island zones follow the official grid and are the island\'s spots', () => {
    const palm = FISH.filter(f => f.areas.includes('palm-island'));
    expect(palm.every(f => f.zones?.length)).toBe(true);
    expect(FISH.filter(f => !ZONED_AREAS.some(a => f.areas.includes(a))).some(f => f.zones)).toBe(false);
    expect(palm.filter(f => f.zones!.includes('A'))).toHaveLength(39);
    expect(palm.filter(f => f.zones!.length === 8).map(f => f.id)).toContain('hogfish');
    for (const f of palm) expect(f.spots['palm-island']).toEqual(f.zones!.map(z => `Zone ${z}`));
    expect(AREAS.find(a => a.id === 'palm-island')!.spots).toEqual(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H']);
  });

  it('Moray tournament zones come from fishao-tracker.cz', () => {
    const moray = FISH.filter(f => f.areas.includes('moray-tournament'));
    expect(moray).toHaveLength(18);
    for (const f of moray) expect(f.spots['moray-tournament']).toEqual(f.zones!.map(z => `Zone ${z}`));
    const zones = Object.fromEntries(moray.map(f => [f.id, f.zones!.join('')]));
    expect(zones).toMatchObject({ 'zebra-moray': 'D', 'viper-moray': 'G', 'paint-spotted-moray': 'ABCDFH', 'salpa-maggiore': 'E' });
    expect(AREAS.find(a => a.id === 'moray-tournament')!.spots).toEqual(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E', 'Zone F', 'Zone G', 'Zone H']);
  });

  it('rarity and the "×n rarer" factor come from fishao.net', () => {
    const fish = (id: string) => FISH.find(f => f.id === id)!;
    expect(fish('murray-cod').rarity).toBe(3);
    expect(fish('xenacanthus').rarity).toBe(4);
    expect(fish('salpa-maggiore')).toMatchObject({ rarity: 5, rarer: 100 });
    expect(fish('arctic-char').rarer).toBeUndefined();
    expect(FISH.filter(f => f.rarer)).toHaveLength(47);
  });

  it('sorting by rarity puts rarer fish of the same stars last', () => {
    const five = sortFish(FISH.filter(f => f.rarity === 5), 'rarity', 'en');
    expect(five.at(-1)!.id).toBe('salpa-maggiore');
    const rarers = five.map(f => f.rarer ?? 1);
    expect(rarers).toEqual([...rarers].sort((a, b) => a - b));
  });

  it('breeding is known for every Backyard fish and nobody else', () => {
    const yard = FISH.filter(f => f.areas.includes('backyard'));
    expect(yard.every(f => f.breed)).toBe(true);
    expect(FISH.filter(f => f.breed)).toHaveLength(yard.length);
    expect(FISH.find(f => f.id === 'bagarius')!.breed).toEqual({ cost: 3300, hours: 32, chance: 0.47 });
  });

  it('unlock conditions: fossils, furniture sets, Jahni\'s fruits, club points', () => {
    const fish = (id: string) => FISH.find(f => f.id === id)!;
    expect(fish('gyrodus').unlock).toContainEqual({ kind: 'fossils', name: 'Gyrodus' });
    expect(fish('hogfish').unlock).toContainEqual({ kind: 'fruits', fruits: ['Coconut', 'Coconut', 'Orange'] });
    expect(FISH.some(f => f.unlock?.some(u => u.kind === 'set' && u.set === 'balloon'))).toBe(true);
    expect(FISH.filter(f => f.unlock?.some(u => u.kind === 'clubPoints'))).toHaveLength(56);
  });

  it('seasons that touch over New Year are one window', () => {
    expect(FISH.find(f => f.id === 'nassau-grouper')!.season).toEqual([{ from: '12-01', to: '01-31' }]);
    expect(FISH.find(f => f.id === 'arctic-char')!.season).toEqual([{ from: '03-01', to: '06-30' }, { from: '09-01', to: '11-30' }]);
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
    expect(locationPatch('cool-mountain:Raft')).toEqual({ area: 'cool-mountain', spot: 'cool-mountain:Raft', spotOnly: false, bred: '', unlocked: '', breeder: null });
    expect(locationPatch('club')).toEqual({ area: 'club', spot: '', spotOnly: false, bred: '', unlocked: '', breeder: null });
    expect(locationPatch('')).toEqual({ area: '', spot: '', spotOnly: false, bred: '', unlocked: '', breeder: null });
  });

  it('combines with search', () => {
    expect(ids(run({ q: 'stika', spot: 'club:Fresh Water Pond' }))).toContain('redfin-pickerel');
  });
});

describe('breeder filter (Chovatelé)', () => {
  const backyard = FISH.filter(x => x.areas.includes('backyard'));
  const theirs = new Set(backyard.slice(0, 3).map(x => x.id));

  it('narrows Backyard to the player fish once the register is loaded', () => {
    const f = { ...EMPTY_FILTERS, area: 'backyard', breeder: 4 };
    expect(ids(applyFilters(FISH, f, emptyProgress(), index, theirs)).sort()).toEqual([...theirs].sort());
    // not loaded yet: the whole backyard, never a guess
    expect(applyFilters(FISH, f, emptyProgress(), index, null)).toHaveLength(backyard.length);
  });

  it('only lives in Backyard: other areas drop it from the URL and the filters', () => {
    expect(parseFilters(new URLSearchParams('area=laketown&breeder=4'), areaIds).breeder).toBeNull();
    expect(parseFilters(new URLSearchParams('area=backyard&breeder=x'), areaIds).breeder).toBeNull();
    expect(serializeFilters({ ...EMPTY_FILTERS, area: 'laketown', breeder: 4 }).breeder).toBeNull();
    expect(locationPatch('laketown').breeder).toBeNull();
  });
});

describe('URL round trip', () => {
  it('serializes and parses back', () => {
    const f: Filters = {
      q: 'stika', area: 'backyard', spot: '', spotOnly: false, rarity: new Set([5, 4]), bait: new Set(['Fish', 'Insects']),
      status: 'uncaught', bred: 'no', unlocked: '', breeder: 7, hour: 22, month: 12, sizeMin: 10, sizeMax: 50,
    };
    const params = new URLSearchParams(Object.entries(serializeFilters(f)).filter(([, v]) => v) as [string, string][]);
    expect(params.toString()).toBe('q=stika&area=backyard&rarity=4%2C5&bait=Fish%2CInsects&status=uncaught&bred=no&breeder=7&hour=22&month=12&sizemin=10&sizemax=50');
    const withSpot = parseFilters(new URLSearchParams('spot=laketown:Trout Farm'), areaIds);
    expect(withSpot.spot).toBe('laketown:Trout Farm');
    expect(serializeFilters(withSpot).spot).toBe('laketown:Trout Farm');
    expect(parseFilters(params, areaIds)).toEqual(f);
    expect(activeFilterCount(f)).toBe(11);
  });

  it('"only here" round trips with a spot and is dropped without one', () => {
    const f = parseFilters(new URLSearchParams('area=cool-mountain&spot=cool-mountain:Raft&only=1'), areaIds);
    expect(f.spotOnly).toBe(true);
    expect(serializeFilters(f).only).toBe('1');
    expect(activeFilterCount(f)).toBe(3);
    expect(parseFilters(new URLSearchParams('area=cool-mountain&only=1'), areaIds).spotOnly).toBe(false);
    expect(serializeFilters({ ...EMPTY_FILTERS, spotOnly: true }).only).toBeNull();
  });

  it('links to a heading area and its spots work; old Inside / Outside links are ignored', () => {
    expect(parseFilters(new URLSearchParams('area=club&rarity=5'), areaIds)).toMatchObject({ area: 'club', spot: '' });
    expect(parseFilters(new URLSearchParams('area=club&spot=club:Salt Water Pond'), areaIds)).toMatchObject({ area: 'club', spot: 'club:Salt Water Pond' });
    expect(parseFilters(new URLSearchParams('area=palm-island&spot=palm-island:Inside'), areaIds)).toMatchObject({ area: 'palm-island', spot: '' });
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
    expect(c.spots.get('cool-mountain:Raft')).toEqual({ total: 10, caught: 1, glow: 0, bred: 0, unlocked: 0 });
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

  it('defaults to rarity (1★ first), then ×n rarer, then by name', () => {
    const out = sortFish(FISH, 'rarity', 'cs');
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i];
      expect(a.rarity <= b.rarity).toBe(true);
      if (a.rarity === b.rarity) expect((a.rarer ?? 1) <= (b.rarer ?? 1)).toBe(true);
      if (a.rarity === b.rarity && (a.rarer ?? 1) === (b.rarer ?? 1)) expect(a.names.cs.localeCompare(b.names.cs, 'cs', { sensitivity: 'base', numeric: true }) <= 0).toBe(true);
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
