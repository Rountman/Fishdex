import { startTransition, useEffect, useState } from 'react';
import type { Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import type { Progress, ProgressField } from '../progress/schema';
import { FishCard } from './FishCard';
import styles from './FishGrid.module.css';

const NONE = { caught: false, caughtGlowing: false };
/** More than fits above the fold on a large screen; the rest renders right after first paint. */
const FIRST_PAINT = 40;

type Props = {
  fish: Fish[];
  progress: Progress;
  query: string;
  areaName: (id: string) => string;
  onToggle: (id: string, field: ProgressField) => void;
  onOpen: (id: string) => void;
  onReset: () => void;
};

export function FishGrid({ fish, progress, query, areaName, onToggle, onOpen, onReset }: Props) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(FIRST_PAINT);
  useEffect(() => {
    // one frame for the first screen, then the rest as a low-priority update
    const id = requestAnimationFrame(() => setTimeout(() => startTransition(() => setLimit(Infinity))));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!fish.length) {
    const q = query.trim();
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{t.emptyTitle}</p>
        <p>{q ? t.emptyQuery(q) : t.emptyFilters} {t.emptyTip}</p>
        <button type="button" className="btn" onClick={onReset}>{t.clearFilters}</button>
      </div>
    );
  }
  return (
    <ul className={styles.grid}>
      {fish.slice(0, limit).map((f, i) => (
        <li key={f.id} className={styles.cell}>
          <FishCard
            fish={f} state={progress.fish[f.id] ?? NONE} areaName={areaName} onToggle={onToggle} onOpen={onOpen}
            priority={i < 2 ? 'high' : i < 8 ? 'eager' : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
