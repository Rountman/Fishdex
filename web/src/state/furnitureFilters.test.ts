import { describe, expect, it } from 'vitest';
import { COLLECTIONS, FURNITURE } from '../data';
import { toggleOwned } from '../progress/progress';
import { emptyProgress, type Progress } from '../progress/schema';
import {
  applyFurnitureFilters, EMPTY_FURNITURE_FILTERS, furnitureFacets, parseFurnitureFilters, serializeFurnitureFilters,
  type FurnitureFilters,
} from './furnitureFilters';
import { buildIndex } from './search';

const index = buildIndex(FURNITURE);
const collectionIds = new Set(COLLECTIONS.map(c => c.id));
const ids = (list: { id: string }[]) => list.map(f => f.id);
const run = (f: Partial<FurnitureFilters>, p: Progress = emptyProgress()) =>
  applyFurnitureFilters(FURNITURE, { ...EMPTY_FURNITURE_FILTERS, ...f }, p, index);

describe('furniture data', () => {
  it('puts every item in exactly one known collection', () => {
    for (const x of FURNITURE) expect(collectionIds).toContain(x.collection);
    expect(COLLECTIONS.reduce((n, c) => n + c.count, 0)).toBe(FURNITURE.length);
  });
});

describe('furniture filters', () => {
  it('finds items by Czech name without diacritics and by English name', () => {
    expect(ids(run({ q: 'zlata televize' }))).toEqual(['gold-tv']);
    expect(ids(run({ q: 'Gold TV' }))).toEqual(['gold-tv']);
  });

  it('filters by collection, type, rarity (incl. unknown) and owned status', () => {
    expect(run({ collection: 'gold' }).every(x => x.collection === 'gold')).toBe(true);
    expect(run({ collection: 'gold' })).toHaveLength(13);
    expect(run({ type: new Set(['wall']) }).every(x => x.type === 'wall')).toBe(true);
    expect(run({ rarity: new Set(['unknown']) }).every(x => x.rarity === null)).toBe(true);
    const p = toggleOwned(emptyProgress(), 'gold-tv');
    expect(ids(run({ status: 'owned' }, p))).toEqual(['gold-tv']);
    expect(run({ status: 'missing' }, p)).toHaveLength(FURNITURE.length - 1);
  });

  it('counts each option with the other filters applied', () => {
    const p = toggleOwned(emptyProgress(), 'gold-tv');
    const f = furnitureFacets(FURNITURE, { ...EMPTY_FURNITURE_FILTERS, collection: 'gold', status: 'owned' }, p, index);
    expect(f.collections.get('gold')).toEqual({ total: 1, owned: 1 });  // collection ignores itself, keeps status
    expect(f.status).toEqual({ all: 13, missing: 12, owned: 1 });        // status ignores itself, keeps collection
    expect(f.all).toEqual({ total: 1, owned: 1 });
  });

  it('round-trips through the URL and drops unknown values', () => {
    const f: FurnitureFilters = { q: 'lampa', collection: 'ice', type: new Set(['plant', 'wall']), rarity: new Set(['epic', 'unknown']), status: 'missing' };
    const params = new URLSearchParams(Object.entries(serializeFurnitureFilters(f)).filter(([, v]) => v) as [string, string][]);
    expect(params.toString()).toBe('fq=lampa&fset=ice&ftype=wall%2Cplant&frarity=epic%2Cunknown&fstatus=missing');
    expect(parseFurnitureFilters(params, collectionIds)).toEqual(f);
    expect(parseFurnitureFilters(new URLSearchParams('fset=nope&ftype=sofa&fstatus=x'), collectionIds)).toEqual(EMPTY_FURNITURE_FILTERS);
  });
});
