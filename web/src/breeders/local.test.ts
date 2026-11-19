import { describe, expect, it } from 'vitest';
import { setBred } from '../progress/progress';
import { emptyProgress, SCHEMA_VERSION, type Progress } from '../progress/schema';
import type { Entry, Me } from './api';
import { bredIds, breederCounts, planSync, readAuthFragment, sortEntries } from './local';

const T0 = new Date('2026-11-19T10:00:00Z');
const BACKYARD = new Set(['ayu', 'discus', 'fire-eel']);
const doc = (fish: Progress['fish']): Progress => ({ version: SCHEMA_VERSION, updatedAt: T0.toISOString(), fish, furniture: {} });
const me = (fish: string[] | null, extra: Partial<Me> = {}): Me => ({
  id: '42', admin: false, banned: false, avatar: null,
  entry: fish && { no: 1, nick: 'Kapr', avatar: null, fish, updatedAt: 0, hidden: null }, ...extra,
});
const entry = (no: number, nick: string, fish: string[]): Entry => ({ no, nick, avatar: null, fish, updatedAt: no });

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

describe('register', () => {
  const list = [entry(1, 'KaprKrál', ['ayu', 'discus']), entry(2, 'Štika', ['ayu']), entry(3, 'zubáč', ['ayu', 'discus', 'fire-eel']), entry(4, 'Lin', ['discus'])];

  it('lists most fish first, then by entry number', () => {
    expect(sortEntries(list).map(e => e.no)).toEqual([3, 1, 2, 4]);
  });

  it('counts breeders per fish', () => {
    expect(Object.fromEntries(breederCounts(list))).toEqual({ ayu: 3, discus: 3, 'fire-eel': 1 });
  });
});
