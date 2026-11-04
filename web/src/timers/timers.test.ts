import { describe, expect, it } from 'vitest';
import { formatCountdown, parseLocalInput, parseTimers, serializeTimers, timerStatus, TIMERS, toLocalInput } from './timers';

const DAY = 86_400_000;

describe('timerStatus', () => {
  it('is idle until first started', () => {
    expect(timerStatus(undefined, DAY, 1000)).toEqual({ kind: 'idle' });
  });
  it('counts down from the click', () => {
    expect(timerStatus(1000, DAY, 1000 + DAY / 4)).toEqual({ kind: 'running', readyAt: 1000 + DAY, remainingMs: DAY * 0.75, elapsed: 0.25 });
  });
  it('is ready exactly when the period ends', () => {
    expect(timerStatus(1000, DAY, 999 + DAY).kind).toBe('running');
    expect(timerStatus(1000, DAY, 1000 + DAY)).toEqual({ kind: 'ready', readyAt: 1000 + DAY });
  });
  it('survives a clock moved backwards', () => {
    const s = timerStatus(5000, DAY, 1000);
    expect(s.kind === 'running' && s.elapsed).toBe(0);
    expect(s.kind === 'running' && s.remainingMs).toBe(DAY);
  });
});

describe('periods', () => {
  it('tree 24 h, meat 10 days, Bob 7 days', () => {
    expect(TIMERS.map(t => [t.id, t.periodMs / DAY])).toEqual([['tree', 1], ['meat', 10], ['bob', 7]]);
  });
});

describe('formatCountdown', () => {
  it('shows days only when there are any', () => {
    expect(formatCountdown(DAY - 1000)).toBe('23:59:59');
    expect(formatCountdown(DAY)).toBe('1 d 00:00:00');
    expect(formatCountdown(7 * DAY - 1000)).toBe('6 d 23:59:59');
  });
  it('rounds up so it never reads zero while running', () => {
    expect(formatCountdown(1)).toBe('00:00:01');
  });
});

describe('local input', () => {
  const now = new Date(2026, 10, 4, 14, 30).getTime();
  it('round-trips in local time', () => {
    expect(toLocalInput(now)).toBe('2026-11-04T14:30');
    expect(parseLocalInput('2026-11-04T14:30', now)).toBe(now);
  });
  it('rejects empty and future values', () => {
    expect(parseLocalInput('', now)).toBeNull();
    expect(parseLocalInput('2026-11-04T14:31', now)).toBeNull();
  });
});

describe('storage format', () => {
  it('round-trips', () => {
    expect(parseTimers(serializeTimers({ tree: 123 }))).toEqual({ state: { tree: 123 }, locked: false });
  });
  it('ignores junk and unknown timers', () => {
    expect(parseTimers('nonsense').state).toEqual({});
    expect(parseTimers(null).state).toEqual({});
    expect(parseTimers('{"version":1,"collectedAt":{"tree":"x","meat":-1,"ben":5,"bob":7}}').state).toEqual({ bob: 7 });
  });
  it('never overwrites a newer version', () => {
    expect(parseTimers('{"version":2,"collectedAt":{"tree":5}}').locked).toBe(true);
  });
});
