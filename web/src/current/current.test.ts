import { describe, expect, it } from 'vitest';
import { FISH } from '../data';
import type { Fish } from '../data/types';
import { fixedOffset, fixedZone, isValidPref, offsetLabel, prefOffset, shiftTime, toHHMM, ZONE_CHOICES, zoneOffset } from '../time/zone';
import { bitesAt, currentFish, inSeasonOn } from './current';

const fish = (id: string, time: Fish['time'], season: Fish['season']): Fish => ({
  id, names: { cs: id, en: id }, areas: [], spots: {}, time, season, rarity: 1, bait: [], size: null, record: null,
  glowing: true, img: { w: 1, h: 1 },
});
const at = (iso: string) => Date.parse(iso);

describe('bitesAt / inSeasonOn', () => {
  it('wraps time windows over midnight and treats 00:00 as the end of the day', () => {
    const night = [{ from: '22:00', to: '04:00' }];
    expect(bitesAt(night, 23 * 60)).toBe(true);
    expect(bitesAt(night, 3 * 60 + 59)).toBe(true);
    expect(bitesAt(night, 4 * 60)).toBe(false);
    expect(bitesAt([{ from: '18:00', to: '00:00' }], 23 * 60 + 59)).toBe(true);
  });
  it('wraps seasons over New Year, unknown is never in season', () => {
    const winter = [{ from: '11-01', to: '02-28' }];
    expect(inSeasonOn(winter, '12-24')).toBe(true);
    expect(inSeasonOn(winter, '03-01')).toBe(false);
    expect(inSeasonOn(null, '01-01')).toBe(false);
  });
});

describe('currentFish', () => {
  const now = at('2026-11-17T14:30:00Z');
  const c = currentFish([
    fish('open', [{ from: '14:00', to: '15:00' }], 'always'),
    fish('later', [{ from: '18:00', to: '19:00' }], 'always'),
    fish('out-of-season', [{ from: '14:00', to: '15:00' }], [{ from: '06-01', to: '06-30' }]),
    fish('ends', 'always', [{ from: '02-01', to: '11-30' }]),
    fish('starts', 'always', [{ from: '12-01', to: '12-31' }]),
    fish('two-ranges', 'always', [{ from: '09-01', to: '12-31' }, { from: '01-01', to: '03-31' }]),
    fish('unknown', null, null),
    fish('always', 'always', 'always'),
  ], now);

  it('counts minutes left in the open window and until the next one', () => {
    expect(c.biting).toEqual([expect.objectContaining({ leftMin: 30 })]);
    expect(c.biting[0].fish.id).toBe('open');
    expect(c.soon.map(s => [s.fish.id, s.waitMin])).toEqual([['later', 210]]);
  });
  it('skips a window that is open but out of season', () => {
    expect([...c.biting, ...c.soon].some(x => x.fish.id === 'out-of-season')).toBe(false);
  });
  it('counts season days including today and joins ranges over New Year', () => {
    expect(c.ending.map(e => [e.fish.id, e.days, e.day])).toEqual([['ends', 14, '11-30'], ['two-ranges', 135, '03-31']]);
    expect(c.upcoming.map(e => [e.fish.id, e.days, e.day])).toEqual([['starts', 14, '12-01'], ['out-of-season', 196, '06-01']]);
  });

  it('matches the fishao.net/wiki overview at 14:30 UTC on 17 Nov 2026', () => {
    const real = currentFish(FISH, now);
    const find = <T extends { fish: Fish }>(list: T[], id: string) => list.find(x => x.fish.id === id);
    expect(find(real.biting, 'chinese-paddlefish')?.leftMin).toBe(30);
    expect(find(real.biting, 'white-sturgeon')?.leftMin).toBe(210);
    expect(find(real.soon, 'bull-trout')?.waitMin).toBe(150);
    expect(find(real.ending, 'horn-shark')?.days).toBe(14);
    expect(find(real.upcoming, 'yellow-tail-arowana')?.days).toBe(14);
  });
});

describe('zones', () => {
  it('knows the Prague offset in winter and summer', () => {
    expect(zoneOffset('Europe/Prague', at('2026-01-15T12:00:00Z'))).toBe(60);
    expect(zoneOffset('Europe/Prague', at('2026-07-15T12:00:00Z'))).toBe(120);
    expect(zoneOffset('America/New_York', at('2026-01-15T12:00:00Z'))).toBe(-300);
    expect(zoneOffset('UTC', at('2026-01-15T12:00:00Z'))).toBe(0);
  });
  it('shifts windows and keeps them wrapping', () => {
    expect(shiftTime([{ from: '23:00', to: '05:00' }], 60)).toEqual([{ from: '00:00', to: '06:00' }]);
    expect(shiftTime([{ from: '18:00', to: '00:00' }], 60)).toEqual([{ from: '19:00', to: '01:00' }]);
    expect(shiftTime([{ from: '02:00', to: '04:00' }], -300)).toEqual([{ from: '21:00', to: '23:00' }]);
    expect(shiftTime('always', 60)).toBe('always');
    expect(toHHMM(-30)).toBe('23:30');
  });
});

describe('fixed UTC offsets', () => {
  it('offers Czechia, the device and every offset from UTC−12 to UTC+14', () => {
    expect(ZONE_CHOICES.slice(0, 2)).toEqual(['Europe/Prague', 'device']);
    expect(ZONE_CHOICES).toContain('UTC-12:00');
    expect(ZONE_CHOICES).toContain('UTC+14:00');
    expect(ZONE_CHOICES).toContain('UTC+05:45');
    expect(ZONE_CHOICES).toContain('UTC');
  });
  it('round-trips and labels offsets', () => {
    expect(fixedZone(330)).toBe('UTC+05:30');
    expect(fixedOffset('UTC-03:30')).toBe(-210);
    expect(fixedOffset('Europe/Prague')).toBeNull();
    expect(offsetLabel(-180)).toBe('UTC−3');
    expect(offsetLabel(345)).toBe('UTC+5:45');
  });
  it('fixed offsets ignore summer time, Czechia follows it', () => {
    const summer = at('2026-07-15T12:00:00Z');
    expect(prefOffset('UTC+01:00', summer)).toBe(60);
    expect(prefOffset('Europe/Prague', summer)).toBe(120);
  });
  it('accepts saved values it understands only', () => {
    expect(isValidPref('UTC+05:30')).toBe(true);
    expect(isValidPref('device')).toBe(true);
    expect(isValidPref('Europe/London')).toBe(true);
    expect(isValidPref('UTC+5')).toBe(false);
    expect(isValidPref('Mars/Base')).toBe(false);
  });
});
