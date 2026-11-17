import { describe, expect, it } from 'vitest';
import { FISH } from '../data';
import type { Fish } from '../data/types';
import { bitesAtHour } from '../state/filters';
import { citiesByOffset } from '../time/cities';
import {
  fixedOffset, fixedZone, isValidPref, localizeFish, offsetLabel, pickerValue, prefOffset, shiftTime, toHHMM, ZONE_CHOICES, zoneOffset,
} from '../time/zone';
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
  it('offers the device and every offset from UTC−12 to UTC+14, no named zones', () => {
    expect(ZONE_CHOICES[0]).toBe('device');
    expect(ZONE_CHOICES.slice(1).every(z => fixedOffset(z) !== null)).toBe(true);
    expect(ZONE_CHOICES).toHaveLength(40);
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

describe('picker', () => {
  const winter = at('2026-01-15T12:00:00Z'), summer = at('2026-07-15T12:00:00Z');
  it('shows the default Czech time as its current offset', () => {
    expect(pickerValue('Europe/Prague', winter)).toBe('UTC+01:00');
    expect(pickerValue('Europe/Prague', summer)).toBe('UTC+02:00');
    expect(pickerValue('UTC-03:30', summer)).toBe('UTC-03:30');
    expect(pickerValue('device', summer)).toBe('device');
  });
  it('puts at most 3 example cities next to the offset they have now', () => {
    const w = citiesByOffset('cs', winter), su = citiesByOffset('cs', summer);
    expect(w.get(60)).toEqual(['Praha', 'Berlín', 'Paříž']);
    expect(su.get(120)?.slice(0, 3)).toEqual(['Praha', 'Berlín', 'Paříž']);
    expect(w.get(-300)?.[0]).toBe('New York');
    expect(citiesByOffset('en', winter).get(330)).toEqual(['Delhi', 'Colombo']);
    expect([...w.values()].every(l => l.length <= 3)).toBe(true);
    expect(w.has(-720)).toBe(false);  // UTC−12: no city, label stays bare
  });
});

describe('catch times converted to every offered zone', () => {
  const timed = FISH.filter(f => Array.isArray(f.time));
  const offsets = ZONE_CHOICES.slice(1).map(z => fixedOffset(z)!);

  it('bite at exactly the same moments as in game time, minute by minute', () => {
    let checks = 0;
    for (const off of offsets) {
      const local = localizeFish(timed, off);
      timed.forEach((f, i) => {
        for (let m = 0; m < 24 * 60; m++) {
          if (bitesAt(local[i].time, m + off) !== bitesAt(f.time, m)) {
            throw new Error(`${f.id} at ${offsetLabel(off)}: minute ${m} UTC differs`);
          }
          checks++;
        }
      });
    }
    expect(checks).toBe(timed.length * offsets.length * 1440);
  });

  it('keep the hour filter right: local hour h = game hour h − offset', () => {
    for (const off of offsets.filter(o => o % 60 === 0)) {
      const local = localizeFish(timed, off);
      timed.forEach((f, i) => {
        for (let h = 0; h < 24; h++) {
          expect(bitesAtHour(local[i].time, h), `${f.id} ${offsetLabel(off)} ${h}h`).toBe(bitesAtHour(f.time, (h - off / 60 + 24) % 24));
        }
      });
    }
  });

  it('give the expected windows for known fish', () => {
    const t = (id: string, off: number) => localizeFish(FISH.filter(f => f.id === id), off)[0].time;
    expect(t('horn-shark', 60)).toEqual([{ from: '00:00', to: '06:00' }]);
    expect(t('horn-shark', 120)).toEqual([{ from: '01:00', to: '07:00' }]);
    expect(t('horn-shark', -300)).toEqual([{ from: '18:00', to: '00:00' }]);
    expect(t('horn-shark', 330)).toEqual([{ from: '04:30', to: '10:30' }]);
    expect(t('arctic-char', 60)).toEqual([{ from: '06:00', to: '12:00' }, { from: '19:00', to: '01:00' }]);
    expect(t('black-arowana', 60)).toEqual([{ from: '11:00', to: '11:15' }, { from: '14:45', to: '15:00' }, { from: '04:15', to: '04:30' }]);
    // seasons are dates, not shifted
    expect(localizeFish(FISH.filter(f => f.id === 'horn-shark'), 600)[0].season).toEqual([{ from: '02-01', to: '11-30' }]);
  });
});
