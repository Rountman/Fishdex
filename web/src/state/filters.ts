// Filter state, its URL form (shareable links) and how it applies to the fish list.
import { AREAS } from '../data';
import type { Fish, Schedule } from '../data/types';
import { BAITS, SPOTS, type Bait, type Spot } from '../i18n/dictionaries';
import type { FishProgress, Progress } from '../progress/schema';
import { matches, type SearchIndex } from './search';

export type Status = 'all' | 'uncaught' | 'caught' | 'noglow';
export type Bred = '' | 'yes' | 'no';
export type View = 'grid' | 'progress';
/** List order, not a filter: "Zrušit vše" keeps it. `rarity` = 1★ → 5★, rarer (×n) later within a star count, then by name. */
export type Sort = 'rarity' | 'name';

export const parseSort = (params: URLSearchParams): Sort => (params.get('sort') === 'name' ? 'name' : 'rarity');
/** Default order stays out of the URL. */
export const serializeSort = (s: Sort) => (s === 'name' ? 'name' : null);

const collators = new Map<string, Intl.Collator>();
const collator = (lang: string) => {
  let c = collators.get(lang);
  if (!c) collators.set(lang, (c = new Intl.Collator(lang, { sensitivity: 'base', numeric: true })));
  return c;
};

/** New array; names compare in the page language (Czech alphabet for cs: "ch" after "h"). */
export function sortFish(fish: readonly Fish[], sort: Sort, lang: 'cs' | 'en'): Fish[] {
  const c = collator(lang);
  const byName = (a: Fish, b: Fish) => c.compare(a.names[lang], b.names[lang]);
  return [...fish].sort(sort === 'rarity' ? (a, b) => a.rarity - b.rarity || (a.rarer ?? 1) - (b.rarer ?? 1) || byName(a, b) : byName);
}

export type Filters = {
  q: string;
  area: string;                 // '' = all areas
  spot: string;                 // '' = any, else '<area>:<Spot>' (a spot belongs to one area)
  spotOnly: boolean;            // only applies with a spot: fish at no other spot of that area
  rarity: ReadonlySet<number>;  // empty = any
  bait: ReadonlySet<Bait>;      // empty = any; otherwise fish takes at least one
  status: Status;
  bred: Bred;                   // only applies while area = backyard
  hour: number | null;          // 0–23: catchable during that hour
  month: number | null;         // 1–12: in season during that month
  sizeMin: number | null;       // cm; fish can reach at least this
  sizeMax: number | null;       // cm; fish can stay at or under this
};

export const EMPTY_FILTERS: Filters = {
  q: '', area: '', spot: '', spotOnly: false, rarity: new Set(), bait: new Set(), status: 'all', bred: '', hour: null, month: null, sizeMin: null, sizeMax: null,
};

const STATUSES: Status[] = ['all', 'uncaught', 'caught', 'noglow'];
export const SIZE_LIMIT = 99999;
const int = (s: string | null, min: number, max: number) => {
  if (s === null || !/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
};

/** Reads filters from the query string; unknown values are ignored, never guessed. */
export function parseFilters(params: URLSearchParams, areaIds: ReadonlySet<string>): Filters {
  const area = params.get('area') ?? '';
  const status = params.get('status') as Status;
  const bred = params.get('bred');
  const spot = parseSpot(params.get('spot'), areaIds);
  return {
    q: params.get('q') ?? '',
    area: areaIds.has(area) ? area : '',
    spot: spot && (!areaIds.has(area) || spot.area === area) ? `${spot.area}:${spot.spot}` : '',
    spotOnly: !!spot && params.get('only') === '1',
    rarity: new Set((params.get('rarity') ?? '').split(',').map(r => int(r, 1, 5)).filter((r): r is number => r !== null)),
    bait: new Set((params.get('bait') ?? '').split(',').filter((b): b is Bait => b in BAITS)),
    status: STATUSES.includes(status) ? status : 'all',
    bred: area === 'backyard' && (bred === 'yes' || bred === 'no') ? bred : '',
    hour: int(params.get('hour'), 0, 23),
    month: int(params.get('month'), 1, 12),
    sizeMin: int(params.get('sizemin'), 0, SIZE_LIMIT),
    sizeMax: int(params.get('sizemax'), 0, SIZE_LIMIT),
  };
}

/** Query-string values for writeParams(); empty filters remove their key. */
export function serializeFilters(f: Filters): Record<string, string | null> {
  return {
    q: f.q.trim() || null,
    area: f.area || null,
    spot: f.spot || null,
    only: f.spot && f.spotOnly ? '1' : null,
    rarity: f.rarity.size ? [...f.rarity].sort().join(',') : null,
    bait: f.bait.size ? [...f.bait].join(',') : null,
    status: f.status === 'all' ? null : f.status,
    bred: f.area === 'backyard' && f.bred ? f.bred : null,
    hour: f.hour === null ? null : String(f.hour),
    month: f.month === null ? null : String(f.month),
    sizemin: f.sizeMin === null ? null : String(f.sizeMin),
    sizemax: f.sizeMax === null ? null : String(f.sizeMax),
  };
}

/** '<area>:<Spot>' → parts. Spots are only those listed in the data (area_spots). */
export const splitSpot = (v: string) => {
  const i = v.indexOf(':');
  return { area: v.slice(0, i), spot: v.slice(i + 1) as Spot };
};
function parseSpot(v: string | null, areaIds: ReadonlySet<string>) {
  if (!v || !v.includes(':')) return null;
  const s = splitSpot(v);
  return areaIds.has(s.area) && s.spot in SPOTS ? s : null;
}

/** Picking an area (or "all") clears the spot; picking '<area>:<Spot>' sets both. */
export const locationPatch = (value: string): Partial<Filters> =>
  value.includes(':') ? { area: splitSpot(value).area, spot: value, spotOnly: false, bred: '' } : { area: value, spot: '', spotOnly: false, bred: '' };

/** Areas without open water (Palm Island, Club): picking one shows every fish of all its spots. */
const HEADING_AREAS: ReadonlySet<string> = new Set(AREAS.filter(a => !a.open).map(a => a.id));

/**
 * Does fish `x` count for area `area` (without a spot selected)? Fish with a spot there bite only at
 * the spot, so they are left out, except in areas that are nothing but spots.
 */
export const inArea = (x: Fish, area: string) =>
  x.areas.includes(area) && (HEADING_AREAS.has(area) || !x.spots[area]?.length);

/** Bites at one spot of the area and no other (other areas don't matter). Only Palm Island has fish at two. */
export const onlyAtSpot = (x: Fish, area: string) => x.spots[area]?.length === 1;

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

/** Known to bite at some minute of hour `h`? `'always'` yes, `null` (unknown) no. */
export function bitesAtHour(time: Schedule, h: number): boolean {
  if (time === 'always') return true;
  if (time === null) return false;
  const start = h * 60, end = start + 59;
  return time.some(w => {
    const a = minutes(w.from);
    const b = w.to === '00:00' ? 24 * 60 : minutes(w.to);  // "until midnight"
    const inside = (m: number) => (a < b ? m >= a && m < b : m >= a || m < b);
    return inside(start) || inside(end) || (a > start && a <= end);
  });
}

const ord = (mmdd: string) => Number(mmdd.slice(0, 2)) * 100 + Number(mmdd.slice(3));

/** In season during some day of month `m`? `'always'` yes, `null` (unknown) no. */
export function inSeasonMonth(season: Schedule, m: number): boolean {
  if (season === 'always') return true;
  if (season === null) return false;
  const first = m * 100 + 1, last = m * 100 + 31;
  return season.some(w => {
    const a = ord(w.from), b = ord(w.to);
    return a <= b ? a <= last && b >= first : a <= last || b >= first; // wraps over New Year
  });
}

const NONE: FishProgress = { caught: false, caughtGlowing: false };

/** Filter groups that show counts; a facet's counts ignore its own selection. */
type FacetKey = 'location' | 'rarity' | 'bait' | 'status';

function predicate(f: Filters, progress: Progress, index: SearchIndex, skip?: FacetKey) {
  const spot = f.spot ? splitSpot(f.spot) : null;
  return (x: Fish) => {
    const s = progress.fish[x.id] ?? NONE;
    if (skip !== 'location') {
      if (spot ? !x.spots[spot.area]?.includes(spot.spot) : f.area && !inArea(x, f.area)) return false;
      if (spot && f.spotOnly && !onlyAtSpot(x, spot.area)) return false;
      if (f.area === 'backyard' && f.bred === 'yes' && !s.bred) return false;
      if (f.area === 'backyard' && f.bred === 'no' && s.bred) return false;
    }
    if (skip !== 'rarity' && f.rarity.size && !f.rarity.has(x.rarity)) return false;
    if (skip !== 'bait' && f.bait.size && !x.bait.some(b => f.bait.has(b))) return false;
    if (skip !== 'status' && !statusMatches(f.status, s)) return false;
    if (f.hour !== null && !bitesAtHour(x.time, f.hour)) return false;
    if (f.month !== null && !inSeasonMonth(x.season, f.month)) return false;
    if (!sizeMatches(x, f.sizeMin, f.sizeMax)) return false;
    return matches(index, x.id, f.q);
  };
}

/** Can the fish's catch length fall inside the asked range? Unknown size never matches an active filter. */
function sizeMatches(x: Fish, min: number | null, max: number | null) {
  if (min === null && max === null) return true;
  if (min !== null && max !== null && min > max) return false;
  return !!x.size && (min === null || x.size.max >= min) && (max === null || x.size.min <= max);
}

const statusMatches = (status: Status, s: FishProgress) =>
  status === 'caught' ? s.caught : status === 'uncaught' ? !s.caught : status === 'noglow' ? !s.caughtGlowing : true;

export function applyFilters(fish: readonly Fish[], f: Filters, progress: Progress, index: SearchIndex): Fish[] {
  return fish.filter(predicate(f, progress, index));
}

export type Tally = { total: number; caught: number; glow: number; bred: number };
const tally = (): Tally => ({ total: 0, caught: 0, glow: 0, bred: 0 });

export type Facets = {
  /** Fish matching every filter except area / spot ("Všechny oblasti"). */
  all: Tally;
  /** Per area, as picking it would show (Palm Island, Club: every fish once, all spots included). */
  areas: Map<string, Tally>;
  /** Keyed '<area>:<Spot>'. */
  spots: Map<string, Tally>;
  /** Fish of the selected spot biting nowhere else in its area. */
  spotOnly: number;
  rarity: Map<number, number>;
  bait: Map<Bait, number>;
  status: Record<Status, number>;
};

/**
 * Counts shown next to each filter option: how many fish that option would
 * give together with all the *other* active filters (its own group ignored).
 */
export function facets(fish: readonly Fish[], f: Filters, progress: Progress, index: SearchIndex): Facets {
  const out: Facets = { all: tally(), areas: new Map(), spots: new Map(), spotOnly: 0, rarity: new Map(), bait: new Map(), status: { all: 0, uncaught: 0, caught: 0, noglow: 0 } };
  const add = (map: Map<string, Tally>, key: string, s: FishProgress) => {
    let t = map.get(key);
    if (!t) map.set(key, (t = tally()));
    t.total++;
    if (s.caught) t.caught++;
    if (s.caughtGlowing) t.glow++;
    if (s.bred) t.bred++;
  };
  const selected = f.spot ? splitSpot(f.spot) : null;
  const loc = predicate(f, progress, index, 'location'), rar = predicate(f, progress, index, 'rarity');
  const bai = predicate(f, progress, index, 'bait'), sta = predicate(f, progress, index, 'status');
  for (const x of fish) {
    const s = progress.fish[x.id] ?? NONE;
    if (loc(x)) {
      out.all.total++;
      if (s.caught) out.all.caught++;
      if (s.caughtGlowing) out.all.glow++;
      if (s.bred) out.all.bred++;
      for (const a of x.areas) if (inArea(x, a)) add(out.areas, a, s);
      for (const [a, list] of Object.entries(x.spots)) for (const sp of list) add(out.spots, `${a}:${sp}`, s);
      if (selected && x.spots[selected.area]?.includes(selected.spot) && onlyAtSpot(x, selected.area)) out.spotOnly++;
    }
    if (rar(x)) out.rarity.set(x.rarity, (out.rarity.get(x.rarity) ?? 0) + 1);
    if (bai(x)) for (const b of x.bait) out.bait.set(b, (out.bait.get(b) ?? 0) + 1);
    if (sta(x)) for (const st of STATUSES) if (statusMatches(st, s)) out.status[st]++;
  }
  return out;
}

/** Number of active filters, search excluded (shown on the mobile "Filtry (n)" button). */
export const activeFilterCount = (f: Filters) =>
  (f.area ? 1 : 0) + (f.spot ? 1 : 0) + (f.spot && f.spotOnly ? 1 : 0) + f.rarity.size + f.bait.size + (f.status !== 'all' ? 1 : 0) +
  (f.area === 'backyard' && f.bred ? 1 : 0) + (f.hour !== null ? 1 : 0) + (f.month !== null ? 1 : 0) +
  (f.sizeMin !== null || f.sizeMax !== null ? 1 : 0);
