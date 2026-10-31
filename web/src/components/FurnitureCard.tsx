import { memo } from 'react';
import { furnitureImage } from '../data';
import type { FurnitureItem } from '../data/types';
import { useI18n } from '../i18n/context';
import { fmtAvailability, fmtMonths, itemName } from '../i18n/format';
import { CalendarIcon } from './icons';
import { RarityLabel } from './RarityLabel';
// same slip, tape and stamp as the fish cards: an owned item is "glued in" like a caught fish
import card from './FishCard.module.css';
import styles from './FurnitureCard.module.css';

export const ITEM_HELP_ID = 'item-help';

type Props = {
  item: FurnitureItem;
  owned: boolean;
  onToggle: (id: string) => void;
  priority?: boolean;
};

function FurnitureCardImpl({ item, owned, onToggle, priority }: Props) {
  const { lang, t } = useI18n();
  const name = itemName(item, lang);
  const avail = fmtAvailability(item.availability, lang);
  // the beta statue is a gift, not sold: no shop months
  const months = item.availability?.kind === 'beta' ? null : fmtMonths(item.season, lang);

  return (
    <article className={`${card.card} ${styles.card}`} data-caught={owned} data-glow={false}>
      <button
        type="button" className={card.hit}
        aria-pressed={owned} aria-label={t.itemAria(name, owned)} aria-describedby={ITEM_HELP_ID}
        onClick={() => onToggle(item.id)}
      />
      <div className={`${card.art} ${styles.art}`}>
        <img
          src={furnitureImage(item.id)} alt="" width={item.img.w} height={item.img.h}
          loading={priority ? 'eager' : 'lazy'} decoding="async"
        />
        <span className={`stamp ${card.stamp}`} aria-hidden="true">{t.stampOwned}</span>
      </div>
      <div className={card.text}>
        <h3 className={card.name}>{name}</h3>
        <p className={styles.meta}>
          <RarityLabel rarity={item.rarity} />
          {item.type && <span className={styles.type}>{t.fTypes[item.type]}</span>}
        </p>
        <p className={`${styles.avail} ${avail.unknown ? styles.unknown : ''}`}>{avail.text}</p>
        {months && (
          <p className={card.time}>
            <CalendarIcon /><span className="visually-hidden">{t.inShop}: </span>
            <span className={months.unknown ? styles.unknown : undefined}>{months.text}</span>
          </p>
        )}
      </div>
    </article>
  );
}

export const FurnitureCard = memo(FurnitureCardImpl);
