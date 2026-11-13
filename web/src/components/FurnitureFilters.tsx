import { useId, type ReactNode } from 'react';
import type { FurnitureCollection } from '../data/types';
import { useI18n } from '../i18n/context';
import { useModal } from '../hooks/useModal';
import { fmtNum } from '../i18n/format';
import {
  activeFurnitureFilterCount, EMPTY_FURNITURE_FILTERS, FURNITURE_TYPES, PRICE_LIMIT, RARITY_OPTIONS,
  type FurnitureFacets, type FurnitureFilters as F, type FurnitureSort, type OwnStatus,
} from '../state/furnitureFilters';
import { FilterIcon, SearchIcon } from './icons';
import { RarityLabel } from './RarityLabel';
// same filter row as the fish list
import styles from './Filters.module.css';

type Props = {
  filters: F;
  facets: FurnitureFacets;
  collections: FurnitureCollection[];
  shown: number;
  total: number;
  mobile: boolean;
  sheetOpen: boolean;
  onSheet: (open: boolean) => void;
  onChange: (patch: Partial<F>) => void;
  sort: FurnitureSort;
  onSort: (sort: FurnitureSort) => void;
  /** Cheapest and dearest price in the data, input placeholders. */
  priceBounds: { min: number; max: number };
};

const STATUSES: OwnStatus[] = ['all', 'missing', 'owned'];
const SORTS: FurnitureSort[] = ['default', 'price-asc', 'price-desc'];
const priceValue = (v: string) => (/^\d+$/.test(v) && Number(v) <= PRICE_LIMIT ? Number(v) : null);

function toggled<T>(set: ReadonlySet<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v); else next.add(v);
  return next;
}

type ControlProps = Pick<Props, 'filters' | 'facets' | 'collections' | 'onChange' | 'sort' | 'onSort' | 'priceBounds'>;

function Controls({ filters: f, facets, collections, onChange, sort, onSort, priceBounds }: ControlProps) {
  const { lang, t } = useI18n();
  const ids = { sort: useId(), set: useId(), type: useId(), rarity: useId(), status: useId(), price: useId() };
  const statusLabel: Record<OwnStatus, string> = { all: t.statusAll, missing: t.fMissing, owned: t.fOwned };
  const sortLabel: Record<FurnitureSort, string> = { default: t.fSortDefault, 'price-asc': t.fSortAsc, 'price-desc': t.fSortDesc };
  return (
    <>
      <div className={styles.row} role="group" aria-labelledby={ids.sort}>
        <span className={styles.label} id={ids.sort}>{t.sortLabel}</span>
        {SORTS.map(s => (
          <button key={s} type="button" className="chip" aria-pressed={sort === s} onClick={() => onSort(s)}>{sortLabel[s]}</button>
        ))}
      </div>
      <div className={styles.row}>
        <label className={styles.label} htmlFor={ids.set}>{t.fIndexTitle}</label>
        <select id={ids.set} className={styles.select} value={f.collection} onChange={e => onChange({ collection: e.target.value })}>
          <option value="">{t.fAll} ({facets.all.total})</option>
          {(['set', 'loose'] as const).map(kind => (
            <optgroup key={kind} label={t.fKinds[kind]}>
              {collections.filter(c => (kind === 'set') === (c.kind === 'set')).map(c => (
                <option key={c.id} value={c.id}>{c.names[lang]} ({facets.collections.get(c.id)?.total ?? 0})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className={styles.row} role="group" aria-labelledby={ids.type}>
        <span className={styles.label} id={ids.type}>{t.fType}</span>
        {FURNITURE_TYPES.map(ty => (
          <button key={ty} type="button" className="chip" aria-pressed={f.type.has(ty)} onClick={() => onChange({ type: toggled(f.type, ty) })}>
            {t.fTypes[ty]}<span className={styles.n}>{facets.type.get(ty) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className={styles.row} role="group" aria-labelledby={ids.rarity}>
        <span className={styles.label} id={ids.rarity}>{t.rarity}</span>
        {RARITY_OPTIONS.map(r => (
          <button key={r} type="button" className="chip" aria-pressed={f.rarity.has(r)} onClick={() => onChange({ rarity: toggled(f.rarity, r) })}>
            <RarityLabel rarity={r === 'unknown' ? null : r} /><span className={styles.n}>{facets.rarity.get(r) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className={styles.row} role="group" aria-labelledby={ids.status}>
        <span className={styles.label} id={ids.status}>{t.status}</span>
        {STATUSES.map(s => (
          <button key={s} type="button" className="chip" aria-pressed={f.status === s} onClick={() => onChange({ status: s })}>
            {statusLabel[s]}<span className={styles.n}>{facets.status[s]}</span>
          </button>
        ))}
      </div>
      <div className={styles.row} role="group" aria-labelledby={ids.price}>
        <span className={styles.label} id={ids.price}>{t.fPrice}</span>
        <label className={styles.sizeField}>{t.sizeFrom}
          <input type="number" inputMode="numeric" min={0} max={PRICE_LIMIT} className={styles.sizeInput} placeholder={String(priceBounds.min)}
            value={f.priceMin ?? ''} onChange={e => onChange({ priceMin: priceValue(e.target.value) })} />
        </label>
        <label className={styles.sizeField}>{t.sizeTo}
          <input type="number" inputMode="numeric" min={0} max={PRICE_LIMIT} className={styles.sizeInput} placeholder={String(priceBounds.max)}
            value={f.priceMax ?? ''} onChange={e => onChange({ priceMax: priceValue(e.target.value) })} />
        </label>
      </div>
    </>
  );
}

function ActiveChips({ filters: f, collections, onChange }: Pick<Props, 'filters' | 'collections' | 'onChange'>) {
  const { lang, t } = useI18n();
  const chips: { key: string; label: ReactNode; text: string; clear: Partial<F> }[] = [];
  const q = f.q.trim();
  if (q) chips.push({ key: 'q', label: `„${q}“`, text: q, clear: { q: '' } });
  if (f.collection) {
    const name = collections.find(c => c.id === f.collection)?.names[lang] ?? f.collection;
    chips.push({ key: 'set', label: name, text: name, clear: { collection: '' } });
  }
  for (const ty of FURNITURE_TYPES.filter(x => f.type.has(x))) {
    chips.push({ key: `t-${ty}`, label: t.fTypes[ty], text: t.fTypes[ty], clear: { type: toggled(f.type, ty) } });
  }
  for (const r of RARITY_OPTIONS.filter(x => f.rarity.has(x))) {
    chips.push({ key: `r-${r}`, label: t.fRarities[r], text: t.fRarityAria(t.fRarities[r]), clear: { rarity: toggled(f.rarity, r) } });
  }
  if (f.status !== 'all') {
    const l = f.status === 'owned' ? t.fOwned : t.fMissing;
    chips.push({ key: 'status', label: l, text: l, clear: { status: 'all' } });
  }
  if (f.priceMin !== null || f.priceMax !== null) {
    const num = (n: number | null) => (n === null ? null : fmtNum(n, lang));
    const l = t.fPriceChip(num(f.priceMin), num(f.priceMax));
    chips.push({ key: 'price', label: l, text: l, clear: { priceMin: null, priceMax: null } });
  }
  if (!chips.length) return null;
  return (
    <div className={styles.active}>
      {chips.map(c => (
        <button key={c.key} type="button" className="chip chip--removable" aria-label={t.removeFilter(c.text)} onClick={() => onChange(c.clear)}>
          {c.label}<span className="x" aria-hidden="true">×</span>
        </button>
      ))}
      {chips.length > 1 && <button type="button" className="link" onClick={() => onChange(EMPTY_FURNITURE_FILTERS)}>{t.clearAll}</button>}
    </div>
  );
}

export function FurnitureFilters(props: Props) {
  const { filters: f, shown, total, mobile, sheetOpen, onSheet, onChange } = props;
  const { t } = useI18n();
  const searchId = useId();
  const sheetTitle = useId();
  const sheet = useModal(mobile && sheetOpen, () => onSheet(false));
  const n = activeFurnitureFilterCount(f);

  return (
    <div className={styles.controls}>
      <div className={styles.searchRow}>
        <label className={styles.search} htmlFor={searchId}>
          <span className="visually-hidden">{t.fSearchLabel}</span>
          <SearchIcon />
          <input id={searchId} type="search" value={f.q} placeholder={t.fSearchPh} autoComplete="off" spellCheck={false}
            onChange={e => onChange({ q: e.target.value })} />
        </label>
        {mobile && (
          <button type="button" className={styles.filtersBtn} aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={() => onSheet(true)}>
            <FilterIcon />{t.filters}{n > 0 && ` (${n})`}
          </button>
        )}
      </div>

      {!mobile && <div className={styles.inline}><Controls {...props} /></div>}

      {mobile && (
        <dialog ref={sheet} className={styles.sheet} aria-labelledby={sheetTitle}>
          <div className={styles.sheetBar}>
            <h2 id={sheetTitle}>{t.filters}</h2>
            <button type="button" className="icon-btn icon-btn--close" aria-label={t.close} onClick={() => onSheet(false)}>×</button>
          </div>
          <div className={styles.sheetBody}><Controls {...props} /></div>
          <div className={styles.sheetFoot}>
            <button type="button" className="btn" onClick={() => onSheet(false)}>{t.fShowN(shown)}</button>
          </div>
        </dialog>
      )}

      <div className={styles.activeRow}>
        <ActiveChips {...props} />
        <span className={styles.count} aria-live="polite">{t.fCount(shown, total)}</span>
      </div>
    </div>
  );
}
