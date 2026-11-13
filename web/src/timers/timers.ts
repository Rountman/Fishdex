// In-game cooldowns. A timer stores only when the reward was last collected; everything
// else is derived, so a countdown keeps running while the page is closed.
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const TIMERS_KEY = 'fishdex:timers:v1';
const VERSION = 1;

export type TimerId = 'meat' | 'bob' | 'factory';
export const TIMERS: readonly { id: TimerId; periodMs: number }[] = [
  { id: 'meat', periodMs: 10 * DAY },
  { id: 'bob', periodMs: 7 * DAY },
  { id: 'factory', periodMs: 2 * DAY },
];

/** Timer id -> epoch ms of the last collection; missing = never started. */
export type TimerState = Partial<Record<TimerId, number>>;

export type TimerStatus =
  | { kind: 'idle' }
  | { kind: 'ready'; readyAt: number }
  | { kind: 'running'; readyAt: number; remainingMs: number; elapsed: number };

export function timerStatus(lastAt: number | undefined, periodMs: number, now: number): TimerStatus {
  if (lastAt === undefined) return { kind: 'idle' };
  const readyAt = lastAt + periodMs;
  if (now >= readyAt) return { kind: 'ready', readyAt };
  return { kind: 'running', readyAt, remainingMs: Math.min(readyAt - now, periodMs), elapsed: Math.max(0, (now - lastAt) / periodMs) };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "23:59:59", with days in front when there are any: "6 d 23:59:59". Rounds up, never shows 00:00:00 early. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86_400);
  const clock = `${pad(Math.floor(total / 3600) % 24)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  return days > 0 ? `${days} d ${clock}` : clock;
}

/** Value for <input type="datetime-local">, in the browser's time zone. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses a datetime-local value; null when empty, invalid or in the future. */
export function parseLocalInput(value: string, now: number): number | null {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) && ms <= now ? ms : null;
}

export function serializeTimers(state: TimerState): string {
  return JSON.stringify({ version: VERSION, collectedAt: state });
}

/** `locked`: written by a newer version, so it is shown but never overwritten. */
export function parseTimers(raw: string | null | undefined): { state: TimerState; locked: boolean } {
  const state: TimerState = {};
  if (!raw) return { state, locked: false };
  try {
    const v = JSON.parse(raw) as { version?: unknown; collectedAt?: Record<string, unknown> };
    for (const { id } of TIMERS) {
      const at = v.collectedAt?.[id];
      if (typeof at === 'number' && Number.isFinite(at) && at > 0) state[id] = at;
    }
    return { state, locked: typeof v.version === 'number' && v.version > VERSION };
  } catch {
    return { state, locked: false };
  }
}
