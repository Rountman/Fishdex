// "Aktuální" tab: what bites right now, soon, and whose season ends or starts.
// Everything is computed from the data (game time = UTC), the same way fishao.net/wiki does it.
import type { Fish, Schedule } from '../data/types';
import { DAY_MIN, toMinutes } from '../time/zone';

export type Biting = { fish: Fish; leftMin: number };
export type Soon = { fish: Fish; waitMin: number };
/** `days` counts today: the last day itself is "1 day left". `day` is "MM-DD". */
export type Ending = { fish: Fish; days: number; day: string };
export type Upcoming = { fish: Fish; days: number; day: string };
export type Current = { biting: Biting[]; soon: Soon[]; ending: Ending[]; upcoming: Upcoming[] };

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
/** UTC calendar date of `ms` as "MM-DD". */
export const mmdd = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** In season on day "MM-DD"? `'always'` yes, `null` (unknown) no. */
export function inSeasonOn(season: Schedule, day: string): boolean {
  if (season === 'always') return true;
  if (season === null) return false;
  return season.some(r => (r.from <= r.to ? day >= r.from && day <= r.to : day >= r.from || day <= r.to));
}

/** Bites at minute `m` of the day (UTC)? Windows with `from > to` wrap over midnight. */
export function bitesAt(time: Schedule, m: number): boolean {
  if (time === 'always') return true;
  if (time === null) return false;
  const x = ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return time.some(w => {
    const a = toMinutes(w.from), b = toMinutes(w.to) || DAY_MIN;
    return a < b ? x >= a && x < b : x >= a || x < b;
  });
}

/** Catchable at instant `ms`: in season that UTC day and inside a time window. */
const catchable = (f: Fish, ms: number) =>
  inSeasonOn(f.season, mmdd(ms)) && bitesAt(f.time, Math.floor((ms % DAY_MS) / 60_000));

const byName = (a: { fish: Fish }, b: { fish: Fish }) => a.fish.id.localeCompare(b.fish.id);

/**
 * Splits the fish into the four lists. Only fish with a limited time window go to biting/soon,
 * only fish with a limited season go to ending/upcoming; unknown (`null`) values go nowhere.
 */
export function currentFish(fish: readonly Fish[], now: number): Current {
  const start = Math.floor(now / 60_000) * 60_000;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const out: Current = { biting: [], soon: [], ending: [], upcoming: [] };

  for (const f of fish) {
    if (Array.isArray(f.time) && f.season !== null) {
      if (catchable(f, start)) {
        let left = 1;
        while (left < DAY_MIN && catchable(f, start + left * 60_000)) left++;
        out.biting.push({ fish: f, leftMin: left });
      } else {
        let wait = 1;
        while (wait < DAY_MIN && !catchable(f, start + wait * 60_000)) wait++;
        if (wait < DAY_MIN) out.soon.push({ fish: f, waitMin: wait });
      }
    }
    if (Array.isArray(f.season)) {
      if (inSeasonOn(f.season, mmdd(today))) {
        let n = 1;
        while (n < 366 && inSeasonOn(f.season, mmdd(today + n * DAY_MS))) n++;
        // n = 366: the ranges cover the whole year, nothing ends
        if (n < 366) out.ending.push({ fish: f, days: n, day: mmdd(today + (n - 1) * DAY_MS) });
      } else {
        let n = 1;
        while (n < 366 && !inSeasonOn(f.season, mmdd(today + n * DAY_MS))) n++;
        if (n < 366) out.upcoming.push({ fish: f, days: n, day: mmdd(today + n * DAY_MS) });
      }
    }
  }

  out.biting.sort((a, b) => a.leftMin - b.leftMin || byName(a, b));
  out.soon.sort((a, b) => a.waitMin - b.waitMin || byName(a, b));
  out.ending.sort((a, b) => a.days - b.days || byName(a, b));
  out.upcoming.sort((a, b) => a.days - b.days || byName(a, b));
  return out;
}
