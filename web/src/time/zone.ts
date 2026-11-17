// Time zones. Fish times in the data are game time = UTC (checked against fishao.net/wiki);
// the UI shows them in the zone picked in the masthead, Prague by default.
import type { Fish, Schedule } from '../data/types';

/**
 * Stored preference: 'Europe/Prague' (default, follows summer time), 'device' = whatever the
 * browser reports, a fixed offset 'UTC', 'UTC+05:30', 'UTC-03:00', or any other IANA id (older saves).
 */
export type ZonePref = string;
export const DEFAULT_ZONE: ZonePref = 'Europe/Prague';
export const DEVICE_ZONE = 'device';

/** Every UTC offset in use, in minutes: whole hours −12…+14 plus the half/quarter ones. */
const FIXED_MINUTES = [
  ...Array.from({ length: 27 }, (_, i) => (i - 12) * 60),
  -570, -210, 210, 270, 330, 345, 390, 525, 570, 630, 765,
].sort((a, b) => a - b);

const pad = (n: number) => String(n).padStart(2, '0');
/** 330 → 'UTC+05:30', 0 → 'UTC'. */
export const fixedZone = (m: number): ZonePref =>
  m === 0 ? 'UTC' : `UTC${m > 0 ? '+' : '-'}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`;
/** 'UTC+05:30' → 330, 'UTC' → 0, anything else → null. */
export function fixedOffset(pref: ZonePref): number | null {
  if (pref === 'UTC') return 0;
  const m = /^UTC([+-])(\d{2}):(\d{2})$/.exec(pref);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
}
/** 330 → 'UTC+5:30', -180 → 'UTC−3', 0 → 'UTC' (typographic minus). */
export const offsetLabel = (m: number) =>
  m === 0 ? 'UTC' : `UTC${m > 0 ? '+' : '−'}${Math.floor(Math.abs(m) / 60)}${Math.abs(m) % 60 ? `:${pad(Math.abs(m) % 60)}` : ''}`;

/** Offered in the masthead: Czechia, this device, then every fixed offset. */
export const ZONE_CHOICES: readonly ZonePref[] = [DEFAULT_ZONE, DEVICE_ZONE, ...FIXED_MINUTES.map(fixedZone)];

export const isValidPref = (pref: string) => pref === DEVICE_ZONE || fixedOffset(pref) !== null || isValidZone(pref);

/** Minutes ahead of UTC at `at` for a preference. */
export function prefOffset(pref: ZonePref, at: number): number {
  return fixedOffset(pref) ?? zoneOffset(resolveZone(pref), at);
}

export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** IANA zone for a preference; an unknown device zone falls back to UTC. */
export function resolveZone(pref: ZonePref): string {
  if (pref !== DEVICE_ZONE) return isValidZone(pref) ? pref : DEFAULT_ZONE;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Minutes the zone is ahead of UTC at `at` (Prague in winter: 60, New York in winter: -300). */
export function zoneOffset(zone: string, at: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(at).map(x => [x.type, Number(x.value)]),
  );
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((wall - Math.floor(at / 60_000) * 60_000) / 60_000);
}

export const DAY_MIN = 24 * 60;
export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
/** Minute of day → "HH:MM", wrapping around midnight. */
export const toHHMM = (m: number) => {
  const x = ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};

/** Time-of-day windows moved by `offset` minutes. "00:00" as an end keeps meaning midnight. */
export function shiftTime(time: Schedule, offset: number): Schedule {
  if (!Array.isArray(time) || offset === 0) return time;
  return time.map(w => ({ from: toHHMM(toMinutes(w.from) + offset), to: toHHMM(toMinutes(w.to) + offset) }));
}

/** Fish with catch times in the given zone; seasons stay by calendar date. */
export function localizeFish(fish: readonly Fish[], offset: number): Fish[] {
  if (offset === 0) return fish.slice();
  return fish.map(f => (Array.isArray(f.time) ? { ...f, time: shiftTime(f.time, offset) } : f));
}
