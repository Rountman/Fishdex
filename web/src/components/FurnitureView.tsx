import type { FurnitureCollection, FurnitureItem } from '../data/types';
import { badgeImage, furnitureImage } from '../data';
import { useI18n } from '../i18n/context';
import type { Progress } from '../progress/schema';
import type { OwnTally } from '../state/furnitureFilters';
import { FurnitureCard } from './FurnitureCard';
import grid from './FishGrid.module.css';
import styles from './FurnitureView.module.css';

type Props = {
  collections: FurnitureCollection[];
  /** Filtered items, in data order. */
  items: FurnitureItem[];
  /** All items, for the collage of sets without a badge. */
  all: FurnitureItem[];
  /** Whole-collection progress, independent of filters (a set is complete or not). */
  totals: Map<string, OwnTally>;
  progress: Progress;
  query: string;
  onToggle: (id: string) => void;
  onReset: () => void;
};

/** Sets without a badge in any source get the first four pieces as a small collage. */
function Badge({ c, all }: { c: FurnitureCollection; all: FurnitureItem[] }) {
  if (c.badge) return <img className={styles.badge} src={badgeImage(c.id)} alt="" width={96} height={96} loading="lazy" decoding="async" />;
  const pieces = all.filter(i => i.collection === c.id).slice(0, 4);
  return (
    <span className={styles.collage} aria-hidden="true">
      {pieces.map(p => <img key={p.id} src={furnitureImage(p.id)} alt="" width={48} height={48} loading="lazy" decoding="async" />)}
    </span>
  );
}

export function FurnitureView({ collections, items, all, totals, progress, query, onToggle, onReset }: Props) {
  const { lang, t } = useI18n();

  if (!items.length) {
    const q = query.trim();
    return (
      <div className={grid.empty}>
        <p className={grid.emptyTitle}>{t.emptyTitle}</p>
        <p>{q ? t.fEmptyQuery(q) : t.fEmptyFilters} {t.fEmptyTip}</p>
        <button type="button" className="btn" onClick={onReset}>{t.clearFilters}</button>
      </div>
    );
  }

  let n = 0;
  return (
    <div className={styles.sections}>
      {collections.map(c => {
        const list = items.filter(i => i.collection === c.id);
        if (!list.length) return null;
        const tally = totals.get(c.id) ?? { total: 0, owned: 0 };
        const done = tally.total > 0 && tally.owned === tally.total;
        const alt = c.names[lang === 'cs' ? 'en' : 'cs'];
        const headId = `col-${c.id}`;
        return (
          <section key={c.id} className={styles.section} aria-labelledby={headId} data-done={done}>
            <header className={styles.head}>
              <Badge c={c} all={all} />
              <div className={styles.title}>
                <h2 id={headId}>{c.names[lang]}</h2>
                {alt !== c.names[lang] && <p className={styles.alt} lang={lang === 'cs' ? 'en' : 'cs'}>{alt}</p>}
              </div>
              <div className={styles.tally}>
                <span className={styles.num}>{tally.owned}<span className="of">/{tally.total}</span></span>
                <span className="bar"><span style={{ width: `${tally.total ? tally.owned / tally.total * 100 : 0}%` }} /></span>
              </div>
              {done && <span className={`stamp ${styles.stamp}`}>{c.kind === 'set' ? t.setDone : t.groupDone}</span>}
            </header>
            <ul className={grid.grid}>
              {list.map(i => (
                <li key={i.id} className={grid.cell}>
                  <FurnitureCard item={i} owned={progress.furniture[i.id]?.owned === true} onToggle={onToggle} priority={n++ < 8} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
