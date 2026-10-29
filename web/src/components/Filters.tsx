import { useId, type ReactNode } from 'react';
import type { Area } from '../data/types';
import { baitLabel } from '../i18n/format';
import { useI18n } from '../i18n/context';
import { useModal } from '../hooks/useModal';
import { activeFilterCount, EMPTY_FILTERS, type Filters as F, type Status } from '../state/filters';
import { BaitPicker } from './BaitPicker';
import { FilterIcon, SearchIcon } from './icons';
import { Stars } from './Stars';
import styles from './Filters.module.css';

type Props = {
  filters: F;
  areas: Area[];
  shown: number;
  total: number;
  mobile: boolean;
  sheetOpen: boolean;
  onSheet: (open: boolean) => void;
  onChange: (patch: Partial<F>) => void;
};

const STATUSES: Status[] = ['all', 'uncaught', 'caught', 'noglow'];

function Controls({ filters: f, areas, mobile, onChange }: Pick<Props, 'filters' | 'areas' | 'mobile' | 'onChange'>) {
  const { t } = useI18n();
  const ids = { rarity: useId(), status: useId(), bait: useId(), yard: useId(), area: useId(), hour: useId(), month: useId() };
  const statusLabel: Record<Status, string> = { all: t.statusAll, uncaught: t.uncaught, caught: t.caught, noglow: t.noglow };
  const toggleRarity = (r: number) => {
    const next = new Set(f.rarity);
    if (next.has(r)) next.delete(r); else next.add(r);
    onChange({ rarity: next });
  };
  const timeOpen = f.hour !== null || f.month !== null;

  return (
    <>
      <div className={styles.row} role="group" aria-labelledby={ids.rarity}>
        <span className={styles.label} id={ids.rarity}>{t.rarity}</span>
        {[1, 2, 3, 4, 5].map(r => (
          <button key={r} type="button" className="chip" aria-pressed={f.rarity.has(r)} onClick={() => toggleRarity(r)}>
            <Stars r={r} />
          </button>
        ))}
      </div>
      <div className={styles.row} role="group" aria-labelledby={ids.status}>
        <span className={styles.label} id={ids.status}>{t.status}</span>
        {STATUSES.map(s => (
          <button key={s} type="button" className="chip" aria-pressed={f.status === s} onClick={() => onChange({ status: s })}>
            {statusLabel[s]}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <label className={styles.label} htmlFor={ids.area}>{t.area}</label>
        <select id={ids.area} className={styles.select} value={f.area} onChange={e => onChange({ area: e.target.value, bred: '' })}>
          <option value="">{t.allAreas}</option>
          {(['area', 'tournament', 'backyard'] as const).map(kind => (
            <optgroup key={kind} label={t.kinds[kind]}>
              {areas.filter(a => a.kind === kind).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className={`${styles.row} ${styles.baitRow}`}>
        <span className={styles.label} id={ids.bait}>{t.bait}</span>
        <BaitPicker selected={f.bait} onChange={bait => onChange({ bait })} labelId={ids.bait} inline={mobile} />
      </div>
      {f.area === 'backyard' && (
        <div className={styles.row} role="group" aria-labelledby={ids.yard}>
          <span className={styles.label} id={ids.yard}>{t.yard}</span>
          {(['', 'yes', 'no'] as const).map(v => (
            <button key={v} type="button" className="chip" aria-pressed={f.bred === v} onClick={() => onChange({ bred: v })}>
              {v === '' ? t.statusAll : v === 'yes' ? t.yardHave : t.yardNot}
            </button>
          ))}
        </div>
      )}
      <details className={styles.more} open={timeOpen || undefined}>
        <summary>{t.more}</summary>
        <div className={styles.moreBody}>
          <label className={styles.label} htmlFor={ids.hour}>{t.hour}</label>
          <select id={ids.hour} className={styles.select} value={f.hour ?? ''}
            onChange={e => onChange({ hour: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">{t.hourAny}</option>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{t.hourOpt(h)}</option>)}
          </select>
          <label className={styles.label} htmlFor={ids.month}>{t.month}</label>
          <select id={ids.month} className={styles.select} value={f.month ?? ''}
            onChange={e => onChange({ month: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">{t.monthAny}</option>
            {t.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <p className={styles.timeNote}>{t.timeNote}</p>
        </div>
      </details>
    </>
  );
}

function ActiveChips({ filters: f, areas, onChange }: Pick<Props, 'filters' | 'areas' | 'onChange'>) {
  const { lang, t } = useI18n();
  const chips: { key: string; label: ReactNode; text: string; clear: Partial<F> }[] = [];
  const q = f.q.trim();
  if (q) chips.push({ key: 'q', label: `„${q}“`, text: q, clear: { q: '' } });
  if (f.area) {
    const name = areas.find(a => a.id === f.area)?.name ?? f.area;
    chips.push({ key: 'area', label: name, text: name, clear: { area: '', bred: '' } });
  }
  for (const r of [...f.rarity].sort()) {
    chips.push({ key: `r${r}`, label: <Stars r={r} decorative />, text: t.rarityAria(r), clear: { rarity: new Set([...f.rarity].filter(x => x !== r)) } });
  }
  if (f.status !== 'all') {
    const l = { uncaught: t.uncaught, caught: t.caught, noglow: t.noglow }[f.status];
    chips.push({ key: 'status', label: l, text: l, clear: { status: 'all' } });
  }
  for (const b of f.bait) {
    const l = baitLabel(b, lang).text;
    chips.push({ key: `b-${b}`, label: l, text: l, clear: { bait: new Set([...f.bait].filter(x => x !== b)) } });
  }
  if (f.area === 'backyard' && f.bred) {
    const l = `${t.yard}: ${f.bred === 'yes' ? t.yardHave : t.yardNot}`;
    chips.push({ key: 'bred', label: l, text: l, clear: { bred: '' } });
  }
  if (f.hour !== null) chips.push({ key: 'hour', label: `${t.hour} ${t.hourOpt(f.hour)}`, text: t.hourOpt(f.hour), clear: { hour: null } });
  if (f.month !== null) chips.push({ key: 'month', label: `${t.month} ${t.months[f.month - 1]}`, text: t.months[f.month - 1], clear: { month: null } });
  if (!chips.length) return null;
  return (
    <div className={styles.active}>
      {chips.map(c => (
        <button key={c.key} type="button" className="chip chip--removable" aria-label={t.removeFilter(c.text)} onClick={() => onChange(c.clear)}>
          {c.label}<span className="x" aria-hidden="true">×</span>
        </button>
      ))}
      {chips.length > 1 && <button type="button" className="link" onClick={() => onChange(EMPTY_FILTERS)}>{t.clearAll}</button>}
    </div>
  );
}

export function Filters(props: Props) {
  const { filters: f, shown, total, mobile, sheetOpen, onSheet, onChange } = props;
  const { t } = useI18n();
  const searchId = useId();
  const sheetTitle = useId();
  const sheet = useModal(mobile && sheetOpen, () => onSheet(false));
  const n = activeFilterCount(f);

  return (
    <div className={styles.controls}>
      <div className={styles.searchRow}>
        <label className={styles.search} htmlFor={searchId}>
          <span className="visually-hidden">{t.searchLabel}</span>
          <SearchIcon />
          <input id={searchId} type="search" value={f.q} placeholder={t.searchPh} autoComplete="off" spellCheck={false}
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
            <button type="button" className="btn" onClick={() => onSheet(false)}>{t.showN(shown)}</button>
          </div>
        </dialog>
      )}

      <div className={styles.activeRow}>
        <ActiveChips {...props} />
        <span className={styles.count} aria-live="polite">{t.count(shown, total)}</span>
      </div>
    </div>
  );
}
