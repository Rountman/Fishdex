import type { FurnitureCollection } from '../data/types';
import { useI18n } from '../i18n/context';
import type { FurnitureFacets, OwnTally } from '../state/furnitureFilters';
// same contents list as the fish areas
import styles from './AreaIndex.module.css';

type Props = {
  collections: FurnitureCollection[];
  facets: FurnitureFacets;
  selected: string;
  onSelect: (id: string) => void;
};

const EMPTY: OwnTally = { total: 0, owned: 0 };

function Row({ label, tally, pressed, onClick }: { label: string; tally: OwnTally; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button" aria-pressed={pressed} onClick={onClick}
      data-done={tally.total > 0 && tally.owned === tally.total} data-empty={tally.total === 0}
    >
      <span className={styles.name}>{label}</span>
      <span className={styles.count}>{tally.owned}<span className="of">/{tally.total}</span></span>
      <span className={`bar ${styles.bar}`}><span style={{ width: `${tally.total ? tally.owned / tally.total * 100 : 0}%` }} /></span>
    </button>
  );
}

export function FurnitureIndex({ collections, facets, selected, onSelect }: Props) {
  const { lang, t } = useI18n();
  const groups = [
    { key: 'set', label: t.fKinds.set, list: collections.filter(c => c.kind === 'set') },
    { key: 'loose', label: t.fKinds.loose, list: collections.filter(c => c.kind !== 'set') },
  ];
  return (
    <nav className={styles.index} aria-labelledby="findex-title">
      <h2 className={styles.title} id="findex-title">{t.fIndexTitle}</h2>
      <ul className={styles.list}>
        <li className={styles.all}>
          <Row label={t.fAll} tally={facets.all} pressed={!selected} onClick={() => onSelect('')} />
        </li>
        {groups.map(g => (
          <li key={g.key}>
            <h3 className={styles.kind}>{g.label}</h3>
            <ul className={styles.list}>
              {g.list.map(c => (
                <li key={c.id}>
                  <Row label={c.names[lang]} tally={facets.collections.get(c.id) ?? EMPTY} pressed={selected === c.id} onClick={() => onSelect(c.id)} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
