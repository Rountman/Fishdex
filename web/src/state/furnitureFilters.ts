// Furniture tab: filter state, its URL form and how it applies to the item list.
// URL keys carry an `f` prefix so fish filters and furniture filters can live in one link.
import { FURNITURE_RARITIES, type FurnitureItem, type FurnitureRarity, type FurnitureType } from '../data/types';
import type { Progress } from '../progress/schema';
import { matches, type SearchIndex } from './search';

export type OwnStatus = 'all' | 'missing' | 'owned';
/** `unknown` selects items whose rarity the sources do not give. */
export type RarityOption = FurnitureRarity | 'unknown';

export type FurnitureFilters = {
  q: string;
  collection: string;                    // '' = all collections
  type: ReadonlySet<FurnitureType>;      // empty = any
  rarity: ReadonlySet<RarityOption>;     // empty = any
  status: OwnStatus;
  priceMin: number | null;               // price at least this
  priceMax: number | null;               // price at most this
};

/** Order inside each collection, not a filter: "Zrušit vše" keeps it. `default` = order of the sources (set pieces). */
export type FurnitureSort = 'default' | 'price-asc' | 'price-desc';
const SORTS: FurnitureSort[] = ['default', 'price-asc', 'price-desc'];
export const parseFurnitureSort = (params: URLSearchParams): FurnitureSort => {
  const s = params.get('fsort') as FurnitureSort;
  return SORTS.includes(s) ? s : 'default';
};
export const serializeFurnitureSort = (s: FurnitureSort) => (s === 'default' ? null : s);

/** New array; unknown price goes last, ties keep the source order. */
export function sortFurniture(items: readonly FurnitureItem[], sort: FurnitureSort): FurnitureItem[] {
  if (sort === 'default') return [...items];
  const dir = sort === 'price-asc' ? 1 : -1;
  return [...items].sort((a, b) =>
    a.price === null || b.price === null ? (a.price === null ? 1 : 0) - (b.price === null ? 1 : 0) : (a.price - b.price) * dir);
}

export const PRICE_LIMIT = 9999999;
const int = (s: string | null) => (s !== null && /^\d+$/.test(s) && Number(s) <= PRICE_LIMIT ? Number(s) : null);

export const EMPTY_FURNITURE_FILTERS: FurnitureFilters = {
  q: '', collection: '', type: new Set(), rarity: new Set(), status: 'all', priceMin: null, priceMax: null,
};

export const FURNITURE_TYPES: FurnitureType[] = ['furniture', 'wall', 'floor', 'plant', 'painting'];
export const RARITY_OPTIONS: RarityOption[] = [...FURNITURE_RARITIES, 'unknown'];
const STATUSES: OwnStatus[] = ['all', 'missing', 'owned'];

const list = <T extends string>(raw: string | null, allowed: readonly T[]) =>
  new Set((raw ?? '').split(',').filter((v): v is T => (allowed as readonly string[]).includes(v)));

/** Reads filters from the query string; unknown values are ignored. */
export function parseFurnitureFilters(params: URLSearchParams, collectionIds: ReadonlySet<string>): FurnitureFilters {
  const collection = params.get('fset') ?? '';
  const status = params.get('fstatus') as OwnStatus;
  return {
    q: params.get('fq') ?? '',
    collection: collectionIds.has(collection) ? collection : '',
    type: list(params.get('ftype'), FURNITURE_TYPES),
    rarity: list(params.get('frarity'), RARITY_OPTIONS),
    status: STATUSES.includes(status) ? status : 'all',
    priceMin: int(params.get('fpmin')),
    priceMax: int(params.get('fpmax')),
  };
}

export function serializeFurnitureFilters(f: FurnitureFilters): Record<string, string | null> {
  return {
    fq: f.q.trim() || null,
    fset: f.collection || null,
    ftype: f.type.size ? FURNITURE_TYPES.filter(t => f.type.has(t)).join(',') : null,
    frarity: f.rarity.size ? RARITY_OPTIONS.filter(r => f.rarity.has(r)).join(',') : null,
    fstatus: f.status === 'all' ? null : f.status,
    fpmin: f.priceMin === null ? null : String(f.priceMin),
    fpmax: f.priceMax === null ? null : String(f.priceMax),
  };
}

type FacetKey = 'collection' | 'type' | 'rarity' | 'status';

const owned = (p: Progress, id: string) => p.furniture[id]?.owned === true;
const statusMatches = (s: OwnStatus, has: boolean) => (s === 'owned' ? has : s === 'missing' ? !has : true);

function predicate(f: FurnitureFilters, progress: Progress, index: SearchIndex, skip?: FacetKey) {
  return (x: FurnitureItem) => {
    if (skip !== 'collection' && f.collection && x.collection !== f.collection) return false;
    if (skip !== 'type' && f.type.size && !(x.type && f.type.has(x.type))) return false;
    if (skip !== 'rarity' && f.rarity.size && !f.rarity.has(x.rarity ?? 'unknown')) return false;
    if (skip !== 'status' && !statusMatches(f.status, owned(progress, x.id))) return false;
    if (!priceMatches(x.price, f.priceMin, f.priceMax)) return false;
    return matches(index, x.id, f.q);
  };
}

/** Unknown price never matches an active price filter. */
function priceMatches(price: number | null, min: number | null, max: number | null) {
  if (min === null && max === null) return true;
  return price !== null && (min === null || price >= min) && (max === null || price <= max);
}

export function applyFurnitureFilters(items: readonly FurnitureItem[], f: FurnitureFilters, progress: Progress, index: SearchIndex) {
  return items.filter(predicate(f, progress, index));
}

export type OwnTally = { total: number; owned: number };

export type FurnitureFacets = {
  /** Items matching every filter except the collection ("Všechny kolekce"). */
  all: OwnTally;
  collections: Map<string, OwnTally>;
  type: Map<FurnitureType, number>;
  rarity: Map<RarityOption, number>;
  status: Record<OwnStatus, number>;
};

/** Counts next to each option: what it would give together with the *other* active filters. */
export function furnitureFacets(items: readonly FurnitureItem[], f: FurnitureFilters, progress: Progress, index: SearchIndex): FurnitureFacets {
  const out: FurnitureFacets = { all: { total: 0, owned: 0 }, collections: new Map(), type: new Map(), rarity: new Map(), status: { all: 0, missing: 0, owned: 0 } };
  const col = predicate(f, progress, index, 'collection'), typ = predicate(f, progress, index, 'type');
  const rar = predicate(f, progress, index, 'rarity'), sta = predicate(f, progress, index, 'status');
  for (const x of items) {
    const has = owned(progress, x.id);
    if (col(x)) {
      out.all.total++;
      if (has) out.all.owned++;
      let t = out.collections.get(x.collection);
      if (!t) out.collections.set(x.collection, (t = { total: 0, owned: 0 }));
      t.total++;
      if (has) t.owned++;
    }
    if (typ(x) && x.type) out.type.set(x.type, (out.type.get(x.type) ?? 0) + 1);
    if (rar(x)) {
      const r = x.rarity ?? 'unknown';
      out.rarity.set(r, (out.rarity.get(r) ?? 0) + 1);
    }
    if (sta(x)) for (const s of STATUSES) if (statusMatches(s, has)) out.status[s]++;
  }
  return out;
}

/** Number of active filters, search and collection excluded (mobile "Filtry (n)"). */
export const activeFurnitureFilterCount = (f: FurnitureFilters) =>
  f.type.size + f.rarity.size + (f.status !== 'all' ? 1 : 0) + (f.priceMin !== null || f.priceMax !== null ? 1 : 0);
