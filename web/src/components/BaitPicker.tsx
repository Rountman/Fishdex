import { useEffect, useId, useRef, useState } from 'react';
import { FISH } from '../data';
import { BAITS, type Bait } from '../i18n/dictionaries';
import { baitLabel } from '../i18n/format';
import { useI18n } from '../i18n/context';
import { ChevronIcon } from './icons';
import styles from './Filters.module.css';

// how many fish take each bait (whole data set), most common first
const COUNTS = (() => {
  const c = new Map<Bait, number>();
  for (const f of FISH) for (const b of f.bait) c.set(b, (c.get(b) ?? 0) + 1);
  return c;
})();
const ORDER = (Object.keys(BAITS) as Bait[]).filter(b => COUNTS.has(b)).sort((a, b) => COUNTS.get(b)! - COUNTS.get(a)!);

type Props = {
  selected: ReadonlySet<Bait>;
  onChange: (next: Set<Bait>) => void;
  labelId: string;
  /** Inside the mobile sheet the list is shown directly, without a popover. */
  inline?: boolean;
};

export function BaitPicker({ selected, onChange, labelId, inline }: Props) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const valueId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = (b: Bait) => {
    const next = new Set(selected);
    if (next.has(b)) next.delete(b); else next.add(b);
    onChange(next);
  };
  const sel = [...selected];
  const value = sel.length === 0 ? t.baitAny : sel.length === 1 ? baitLabel(sel[0], lang).text : t.baitN(sel.length);

  const list = (
    <>
      <p className={styles.panelHint}>{t.baitHint}</p>
      <ul className={styles.baitList}>
        {ORDER.map(b => {
          const l = baitLabel(b, lang);
          return (
            <li key={b}>
              <label className={styles.check}>
                <input type="checkbox" checked={selected.has(b)} onChange={() => toggle(b)} />
                <span className={`${styles.checkLabel} ${l.untranslated ? 'untranslated' : ''}`}>{l.text}</span>
                <span className={styles.leader} aria-hidden="true" />
                <span className={styles.checkCount}>{COUNTS.get(b)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );

  if (inline) return <div role="group" aria-labelledby={labelId}>{list}</div>;

  return (
    <div className={styles.picker} ref={root}>
      <button
        ref={button} type="button" className={styles.pickerBtn}
        aria-expanded={open} aria-controls={panelId} aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setOpen(o => !o)}
      >
        <span id={valueId}>{value}</span><ChevronIcon />
      </button>
      <div className={styles.panel} id={panelId} role="group" aria-labelledby={labelId} hidden={!open}>
        {list}
        <div className={styles.panelFoot}>
          <button type="button" className="link" onClick={() => onChange(new Set())}>{t.clearSel}</button>
          <button type="button" className="btn" onClick={() => { setOpen(false); button.current?.focus(); }}>{t.done}</button>
        </div>
      </div>
    </div>
  );
}
