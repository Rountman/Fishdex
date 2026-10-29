import type { Fish } from '../data/types';
import { useI18n } from '../i18n/context';
import type { Progress, ProgressField } from '../progress/schema';
import { FishCard } from './FishCard';
import styles from './FishGrid.module.css';

const NONE = { caught: false, caughtGlowing: false };

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
      {fish.map(f => (
        <li key={f.id} className={styles.cell}>
          <FishCard fish={f} state={progress.fish[f.id] ?? NONE} areaName={areaName} onToggle={onToggle} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
