import type { ReactNode } from 'react';
import type { Area } from '../data/types';
import { useI18n } from '../i18n/context';
import { spotLabel } from '../i18n/format';
import type { Facets, Tally } from '../state/filters';
import styles from './AreaIndex.module.css';

type Props = {
  areas: Area[];
  /** Counts with all other active filters applied. */
  facets: Facets;
  area: string;
  spot: string;
  /** '' = all areas, an area id, or '<area>:<Spot>'. */
  onSelect: (value: string) => void;
};

const EMPTY: Tally = { total: 0, caught: 0, glow: 0, bred: 0 };

function Row({ label, tally, pressed, onClick, sub, extra }: {
  label: string; tally: Tally; pressed: boolean; onClick: () => void; sub?: boolean; extra?: ReactNode;
}) {
  return (
    <button
      type="button" aria-pressed={pressed} onClick={onClick} className={sub ? styles.sub : undefined}
      data-done={tally.total > 0 && tally.caught === tally.total} data-empty={tally.total === 0}
    >
      <span className={styles.name}>{label}</span>
      <span className={styles.count}>{tally.caught}<span className="of">/{tally.total}</span></span>
      <span className={`bar ${styles.bar}`}><span style={{ width: `${tally.total ? tally.caught / tally.total * 100 : 0}%` }} /></span>
      {extra}
    </button>
  );
}

export function AreaIndex({ areas, facets, area, spot, onSelect }: Props) {
  const { lang, t } = useI18n();
  const kinds = ['area', 'tournament', 'backyard'] as const;
  return (
    <nav className={styles.index} aria-labelledby="index-title">
      <h2 className={styles.title} id="index-title">{t.indexTitle}</h2>
      <ul className={styles.list}>
        <li className={styles.all}>
          <Row label={t.allAreas} tally={facets.all} pressed={!area} onClick={() => onSelect('')} />
        </li>
        {kinds.map(kind => (
          <li key={kind}>
            <h3 className={styles.kind}>{t.kinds[kind]}</h3>
            <ul className={styles.list}>
              {areas.filter(a => a.kind === kind).map(a => {
                const tally = facets.areas.get(a.id) ?? EMPTY;
                return (
                  <li key={a.id}>
                    <Row
                      label={a.name} tally={tally} pressed={area === a.id && !spot} onClick={() => onSelect(a.id)}
                      extra={kind === 'backyard' && (
                        <span className={styles.bred}>{t.bredNote} {tally.bred}<span className="of">/{tally.total}</span></span>
                      )}
                    />
                    {a.spots.length > 0 && (
                      <ul className={styles.spots}>
                        {a.spots.map(sp => {
                          const key = `${a.id}:${sp}`;
                          return (
                            <li key={key}>
                              <Row
                                sub label={spotLabel(sp, lang).text} tally={facets.spots.get(key) ?? EMPTY}
                                pressed={spot === key} onClick={() => onSelect(key)}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
