import { describe, expect, it } from 'vitest';
import { setBred } from '../progress/progress';
import { emptyProgress, SCHEMA_VERSION, type Progress } from '../progress/schema';
import type { Entry, Me } from './api';
import {
  bredIds, breederCounts, EMPTY_BREEDER_FILTERS, filterEntries, parseBreederFilters, planSync, readAuthFragment,
  serializeBreederFilters,
} from './local';

const T0 = new Date('2026-11-19T10:00:00Z');
const BACKYARD = new Set(['ayu', 'discus', 'fire-eel']);
const doc = (fish: Progress['fish']): Progress => ({ version: SCHEMA_VERSION, updatedAt: T0.toISOString(), fish, furniture: {} });
const me = (fish: string[] | null, extra: Partial<Me> = {}): Me => ({
  id: '42', admin: false, banned: false, avatar: null,
  entry: fish && { no: 1, nick: 'Kapr', avatar: null, fish, updatedAt: 0, hidden: null }, ...extra,
});
const entry = (no: number, nick: string, fish: string[], updatedAt = no): Entry => ({ no, nick, avatar: null, fish, updatedAt });

describe('bredIds', () => {
  it('takes backyard fish marked bred, sorted', () => {
    const p = doc({
      'fire-eel': { caught: true, caughtGlowing: false, bred: true },
      ayu: { caught: false, caughtGlowing: false, bred: true },
      discus: { caught: true, caughtGlowing: false },
      'gone-fish': { caught: false, caughtGlowing: false, bred: true }, // no longer a backyard fish
    });
    expect(bredIds(p, BACKYARD)).toEqual(['ayu', 'fire-eel']);
  });
});

describe('planSync', () => {
  it('does nothing until something is published', () => {
    expect(planSync(null, null, ['ayu'])).toEqual({ kind: 'off' });
    expect(planSync(me(null), null, ['ayu'])).toEqual({ kind: 'off' });
    expect(planSync(me(['ayu'], { banned: true }), null, [])).toEqual({ kind: 'off' });
  });

  it('is in sync when the lists match, whatever this browser remembers', () => {
    expect(planSync(me(['ayu']), null, ['ayu'])).toEqual({ kind: 'synced' });
  });

  it('sends local changes when the register still has what this browser sent', () => {
    expect(planSync(me(['ayu']), { owner: '42', sent: ['ayu'] }, ['ayu', 'discus'])).toEqual({ kind: 'send', fish: ['ayu', 'discus'] });
    expect(planSync(me(['ayu']), { owner: '42', sent: ['ayu'] }, [])).toEqual({ kind: 'send', fish: [] });
  });

  it('asks instead of overwriting when the register changed elsewhere or this browser never synced', () => {
    const conflict = { kind: 'conflict', server: ['ayu'], local: [] };
    expect(planSync(me(['ayu']), null, [])).toEqual(conflict);                              // new device, empty journal
    expect(planSync(me(['ayu']), { owner: '42', sent: ['discus'] }, [])).toEqual(conflict); // edited on another device
    expect(planSync(me(['ayu']), { owner: '7', sent: ['ayu'] }, [])).toEqual(conflict);     // another Discord account
  });
});

describe('setBred (take the register version)', () => {
  it('sets bred exactly among the backyard fish and keeps the rest', () => {
    const p = doc({
      ayu: { caught: true, caughtGlowing: false, bred: true },
      discus: { caught: false, caughtGlowing: false, bred: true },
      'great-white-shark': { caught: true, caughtGlowing: false },
    });
    const next = setBred(p, ['fire-eel', 'ayu'], [...BACKYARD], T0);
    expect(next.fish).toEqual({
      ayu: { caught: true, caughtGlowing: false, bred: true },
      'fire-eel': { caught: false, caughtGlowing: false, bred: true },
      'great-white-shark': { caught: true, caughtGlowing: false },
    });
    expect(setBred(emptyProgress(T0), [], [...BACKYARD], T0).fish).toEqual({});
  });
});

describe('readAuthFragment', () => {
  it('reads the session or the error left by the login redirect', () => {
    const token = 'A'.repeat(43);
    expect(readAuthFragment(`#session=${token}`)).toEqual({ session: token });
    expect(readAuthFragment('#auth_error=denied')).toEqual({ error: 'denied' });
    expect(readAuthFragment('#auth_error=whatever')).toEqual({ error: 'failed' });
    expect(readAuthFragment('#session=<script>')).toBeNull();
    expect(readAuthFragment('')).toBeNull();
  });
});

describe('register filters', () => {
  const list = [entry(1, 'KaprKrál', ['ayu', 'discus'], 5), entry(2, 'Štika', ['ayu'], 9), entry(3, 'zubáč', ['ayu', 'discus', 'fire-eel'], 1)];

  it('sorts by fish count, then by entry number; or by last change', () => {
    expect(filterEntries(list, EMPTY_BREEDER_FILTERS).map(e => e.no)).toEqual([3, 1, 2]);
    expect(filterEntries(list, { ...EMPTY_BREEDER_FILTERS, sort: 'recent' }).map(e => e.no)).toEqual([2, 1, 3]);
  });

  it('searches nicknames without diacritics and filters by fish', () => {
    expect(filterEntries(list, { ...EMPTY_BREEDER_FILTERS, q: 'stik' }).map(e => e.nick)).toEqual(['Štika']);
    expect(filterEntries(list, { ...EMPTY_BREEDER_FILTERS, fish: 'discus' }).map(e => e.no)).toEqual([3, 1]);
  });

  it('counts breeders per fish', () => {
    expect(Object.fromEntries(breederCounts(list))).toEqual({ ayu: 3, discus: 2, 'fire-eel': 1 });
  });

  it('round-trips through the URL and ignores unknown fish', () => {
    const f = { q: 'kapr', fish: 'ayu', sort: 'recent' as const };
    const params = new URLSearchParams(Object.entries(serializeBreederFilters(f)).filter(([, v]) => v) as [string, string][]);
    expect(parseBreederFilters(params, BACKYARD)).toEqual(f);
    expect(parseBreederFilters(new URLSearchParams('bfish=shark&bsort=x'), BACKYARD)).toEqual(EMPTY_BREEDER_FILTERS);
  });
});
