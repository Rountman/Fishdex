import { memo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { fishImage, isBackyard, isClub } from '../data';
import { isZonedArea, type Fish } from '../data/types';
import { baitLabel, fishName, fmtPrice, fmtRecord, fmtSeason, fmtSize, fmtTime, spotLabel } from '../i18n/format';
import { useI18n } from '../i18n/context';
import type { FishProgress, ProgressField } from '../progress/schema';
import { CalendarIcon, ClockIcon, CoinIcon, GlowIcon, HouseIcon, UnlockIcon } from './icons';
import { Stars } from './Stars';
import styles from './FishCard.module.css';

export const CARD_HELP_ID = 'card-help';
const LONG_PRESS_MS = 500;

type Props = {
  fish: Fish;
  state: FishProgress;
  areaName: (id: string) => string;
  onToggle: (id: string, field: ProgressField) => void;
  onOpen: (id: string) => void;
  /** Above the fold: load eagerly (the first image is the LCP element). */
  priority?: 'high' | 'eager';
};

/** Areas with their spots; zoned areas list their zones in short ("zóny B, C, G", "všechny zóny"). */
export function Where({ fish, areaName, first }: { fish: Fish; areaName: (id: string) => string; first?: boolean }) {
  const { lang, t } = useI18n();
  const list = first ? fish.areas.slice(0, 1) : fish.areas;
  return list.map((a, i) => (
    <span key={a}>
      {i > 0 && (first ? ' ' : <br />)}
      {areaName(a)}
      {isZonedArea(a) && fish.zones
        ? <> <span className="note">{t.zones(fish.zones)}</span></>
        : fish.spots[a] && <> <span className="note">{fish.spots[a].map(s => spotLabel(s, lang).text).join(', ')}</span></>}
    </span>
  ));
}

/** "×10" next to the stars: rarer than the other fish with the same star count. */
export function Rarer({ fish }: { fish: Fish }) {
  const { t } = useI18n();
  if (!fish.rarer) return null;
  const long = t.rarer(fish.rarer, fish.rarity);
  return <abbr className="rarer" title={long}>×{fish.rarer}<span className="visually-hidden"> {long}</span></abbr>;
}

function FishCardImpl({ fish, state, areaName, onToggle, onOpen, priority }: Props) {
  const { lang, t } = useI18n();
  const name = fishName(fish, lang);
  const [pressing, setPressing] = useState(false);
  const timer = useRef(0);
  const longPressed = useRef(false);

  const endPress = () => { clearTimeout(timer.current); setPressing(false); };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    longPressed.current = false;
    setPressing(true);
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      setPressing(false);
      navigator.vibrate?.(15);
      onToggle(fish.id, 'caughtGlowing');
    }, LONG_PRESS_MS);
  };
  const onClick = (e: MouseEvent) => {
    if (longPressed.current) { longPressed.current = false; return; }
    onToggle(fish.id, e.shiftKey ? 'caughtGlowing' : 'caught');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onToggle(fish.id, 'caughtGlowing'); }
  };

  const yard = isBackyard(fish);
  const club = isClub(fish);
  const cls = pressing ? `${styles.card} ${styles.pressing}` : styles.card;

  return (
    <article className={cls} data-caught={state.caught} data-glow={state.caughtGlowing}>
      <button
        type="button" className={styles.hit}
        aria-pressed={state.caught} aria-label={t.cardAria(name, state.caught)} aria-describedby={CARD_HELP_ID}
        onClick={onClick} onKeyDown={onKeyDown}
        onPointerDown={onPointerDown} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
        onContextMenu={e => e.preventDefault()}
      />
      <div className={styles.art}>
        <img
          src={fishImage(fish.id)} alt="" width={fish.img.w} height={fish.img.h}
          style={{ maxWidth: fish.img.w * 2, maxHeight: fish.img.h * 2 }}
          loading={priority ? 'eager' : 'lazy'} fetchPriority={priority === 'high' ? 'high' : undefined} decoding="async"
        />
        <span className={`stamp ${styles.stamp}`} aria-hidden="true">{t.stamp}</span>
      </div>
      <div className={styles.text}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.bait}>
          <span className="visually-hidden">{t.bait}: </span>
          {fish.bait.map((b, i) => {
            const l = baitLabel(b, lang);
            return <span key={b}>{i > 0 && ', '}<span className={l.untranslated ? 'untranslated' : undefined}>{l.text}</span></span>;
          })}
        </p>
        <p className={styles.meta}>
          <span><Stars r={fish.rarity} /> <Rarer fish={fish} /></span>
          <span className={styles.len}>{fmtSize(fish.size) ?? fmtRecord(fish.record)?.text ?? t.lenUnknown}</span>
        </p>
        {fish.price && (
          <p className={styles.price}>
            <CoinIcon />
            <span aria-hidden="true">{fmtPrice(fish.price, lang)}</span>
            <span className="visually-hidden">{t.sellSpoken(fish.price.min, fish.price.max)}</span>
          </p>
        )}
        {/* real windows only: "always" / "all year" and unknown stay off the card (all of it is in the detail) */}
        {Array.isArray(fish.time) && (
          <p className={styles.time}>
            <ClockIcon /><span className="visually-hidden">{t.when}: </span>
            {fmtTime(fish.time, lang).text}
          </p>
        )}
        {Array.isArray(fish.season) && (
          <p className={styles.time}>
            <CalendarIcon /><span className="visually-hidden">{t.season}: </span>
            {fmtSeason(fish.season, lang).text}
          </p>
        )}
        <p className={styles.where}>
          <Where fish={fish} areaName={areaName} first />
          {fish.areas.length > 1 && <span className="of"> +{fish.areas.length - 1}</span>}
        </p>
        {yard && state.bred && <p className={styles.bred}>{t.bredNote}</p>}
        {club && state.unlocked && <p className={styles.bred}>{t.unlockedNote}</p>}
      </div>
      <button
        type="button" className={`icon-btn icon-btn--glow ${styles.glow}`}
        aria-pressed={state.caughtGlowing} aria-label={t.glowAria(name)}
        onClick={() => onToggle(fish.id, 'caughtGlowing')}
      ><GlowIcon /></button>
      {yard && (
        <button
          type="button" className={`icon-btn icon-btn--bred ${styles.bredBtn}`}
          aria-pressed={!!state.bred} aria-label={t.bredAria(name)}
          onClick={() => onToggle(fish.id, 'bred')}
        ><HouseIcon /></button>
      )}
      {club && (
        <button
          type="button" className={`icon-btn icon-btn--unlocked ${styles.bredBtn}`}
          aria-pressed={!!state.unlocked} aria-label={t.unlockedAria(name)}
          onClick={() => onToggle(fish.id, 'unlocked')}
        ><UnlockIcon /></button>
      )}
      <button type="button" className={`link link--note ${styles.open}`} onClick={() => onOpen(fish.id)}>
        {t.open}<span className="visually-hidden">{t.openFor(name)}</span>
      </button>
    </article>
  );
}

export const FishCard = memo(FishCardImpl);
