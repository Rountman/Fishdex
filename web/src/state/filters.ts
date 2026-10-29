// Filter state, its URL form (shareable links) and how it applies to the fish list.
import type { Fish, Schedule } from '../data/types';
import { BAITS, type Bait } from '../i18n/dictionaries';
import type { FishProgress, Progress } from '../progress/schema';
import { matches, type SearchIndex } from './search';

export type Status = 'all' | 'uncaught' | 'caught' | 'noglow';
export type Bred = '' | 'yes' | 'no';
export type View = 'grid' | 'progress';

export type Filters = {
  q: string;
  area: string;                 // '' = all areas
  rarity: ReadonlySet<number>;  // empty = any
  bait: ReadonlySet<Bait>;      // empty = any; otherwise fish takes at least one
  status: Status;
  bred: Bred;                   // only applies while area = backyard
  hour: number | null;          // 0–23: catchable during that hour
  month: number | null;         // 1–12: in season during that month
};

export const EMPTY_FILTERS: Filters = {
  q: '', area: '', rarity: new Set(), bait: new Set(), status: 'all', bred: '', hour: null, month: null,
};

const STATUSES: Status[] = ['all', 'uncaught', 'caught', 'noglow'];
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
  return {
    q: params.get('q') ?? '',
    area: areaIds.has(area) ? area : '',
    rarity: new Set((params.get('rarity') ?? '').split(',').map(r => int(r, 1, 5)).filter((r): r is number => r !== null)),
    bait: new Set((params.get('bait') ?? '').split(',').filter((b): b is Bait => b in BAITS)),
    status: STATUSES.includes(status) ? status : 'all',
    bred: area === 'backyard' && (bred === 'yes' || bred === 'no') ? bred : '',
    hour: int(params.get('hour'), 0, 23),
    month: int(params.get('month'), 1, 12),
  };
}

/** Query-string values for writeParams(); empty filters remove their key. */
export function serializeFilters(f: Filters): Record<string, string | null> {
  return {
    q: f.q.trim() || null,
    area: f.area || null,
    rarity: f.rarity.size ? [...f.rarity].sort().join(',') : null,
    bait: f.bait.size ? [...f.bait].join(',') : null,
    status: f.status === 'all' ? null : f.status,
    bred: f.area === 'backyard' && f.bred ? f.bred : null,
    hour: f.hour === null ? null : String(f.hour),
    month: f.month === null ? null : String(f.month),
  };
}

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

export function applyFilters(fish: readonly Fish[], f: Filters, progress: Progress, index: SearchIndex): Fish[] {
  return fish.filter(x => {
    const s = progress.fish[x.id] ?? NONE;
    if (f.area && !x.areas.includes(f.area)) return false;
    if (f.rarity.size && !f.rarity.has(x.rarity)) return false;
    if (f.bait.size && !x.bait.some(b => f.bait.has(b))) return false;
    if (f.status === 'caught' && !s.caught) return false;
    if (f.status === 'uncaught' && s.caught) return false;
    if (f.status === 'noglow' && s.caughtGlowing) return false;
    if (f.area === 'backyard' && f.bred === 'yes' && !s.bred) return false;
    if (f.area === 'backyard' && f.bred === 'no' && s.bred) return false;
    if (f.hour !== null && !bitesAtHour(x.time, f.hour)) return false;
    if (f.month !== null && !inSeasonMonth(x.season, f.month)) return false;
    return matches(index, x.id, f.q);
  });
}

/** Number of active filters, search excluded (shown on the mobile "Filtry (n)" button). */
export const activeFilterCount = (f: Filters) =>
  (f.area ? 1 : 0) + f.rarity.size + f.bait.size + (f.status !== 'all' ? 1 : 0) +
  (f.area === 'backyard' && f.bred ? 1 : 0) + (f.hour !== null ? 1 : 0) + (f.month !== null ? 1 : 0);
