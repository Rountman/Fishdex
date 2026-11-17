// Time zones. Fish times in the data are game time = UTC (checked against fishao.net/wiki);
// the UI shows them in the zone picked in the masthead, Prague by default.
import type { Fish, Schedule } from '../data/types';

/** Stored preference: an IANA zone id, or 'device' = whatever the browser reports. */
export type ZonePref = string;
export const DEFAULT_ZONE: ZonePref = 'Europe/Prague';
export const DEVICE_ZONE = 'device';
/** Offered in the masthead; labels live in strings.ts (`zones`). */
export const ZONE_CHOICES = [
  'Europe/Prague', 'UTC', 'Europe/London', 'Europe/Istanbul', 'Europe/Moscow', 'America/New_York', 'America/Sao_Paulo', DEVICE_ZONE,
] as const;

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
const pad = (n: number) => String(n).padStart(2, '0');
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
