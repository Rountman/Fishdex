import type { FurnitureRarity } from '../data/types';
import { useI18n } from '../i18n/context';
import { RARITY_TIER } from '../i18n/format';
import styles from './FurnitureCard.module.css';

/** Furniture rarity: the word is the information, the colour only repeats it. */
export function RarityLabel({ rarity }: { rarity: FurnitureRarity | null }) {
  const { t } = useI18n();
  const label = t.fRarities[rarity ?? 'unknown'];
  return (
    <span className={styles.rarity} data-r={rarity ? RARITY_TIER[rarity] : 0}>
      <span aria-hidden="true" className={styles.gem}>◆</span>
      <span className="visually-hidden">{t.fRarityAria(label)}</span>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}
