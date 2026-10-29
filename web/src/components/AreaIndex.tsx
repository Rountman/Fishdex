import type { Area } from '../data/types';
import { useI18n } from '../i18n/context';
import styles from './AreaIndex.module.css';

export type AreaStat = Area & { caught: number; glow: number; bred: number };

type Props = {
  stats: AreaStat[];
  total: number;
  caught: number;
  active: string;
  onSelect: (area: string) => void;
};

const Bar = ({ n, of }: { n: number; of: number }) => (
  <span className={`bar ${styles.bar}`}><span style={{ width: `${of ? n / of * 100 : 0}%` }} /></span>
);

export function AreaIndex({ stats, total, caught, active, onSelect }: Props) {
  const { t } = useI18n();
  const kinds = ['area', 'tournament', 'backyard'] as const;
  return (
    <nav className={styles.index} aria-labelledby="index-title">
      <h2 className={styles.title} id="index-title">{t.indexTitle}</h2>
      <ul className={styles.list}>
        <li className={styles.all}>
          <button type="button" aria-pressed={!active} onClick={() => onSelect('')}>
            <span className={styles.name}>{t.allAreas}</span>
            <span className={styles.count}>{caught}<span className="of">/{total}</span></span>
            <Bar n={caught} of={total} />
          </button>
        </li>
        {kinds.map(kind => (
          <li key={kind}>
            <h3 className={styles.kind}>{t.kinds[kind]}</h3>
            <ul className={styles.list}>
              {stats.filter(a => a.kind === kind).map(a => (
                <li key={a.id}>
                  <button type="button" aria-pressed={active === a.id} onClick={() => onSelect(a.id)} data-done={a.caught === a.count}>
                    <span className={styles.name}>{a.name}</span>
                    <span className={styles.count}>{a.caught}<span className="of">/{a.count}</span></span>
                    <Bar n={a.caught} of={a.count} />
                    {kind === 'backyard' && (
                      <span className={styles.bred}>{t.bredNote} {a.bred}<span className="of">/{a.count}</span></span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
