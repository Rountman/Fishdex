import { useI18n } from '../i18n/context';

/** Rarity: the mark is the star count, not just the colour; read as "rarita n z 5". */
export function Stars({ r, decorative }: { r: number; decorative?: boolean }) {
  const { t } = useI18n();
  return decorative
    ? <span className="stars" data-r={r} aria-hidden="true">{'★'.repeat(r)}</span>
    : <span className="stars" data-r={r} role="img" aria-label={t.rarityAria(r)}>{'★'.repeat(r)}</span>;
}
