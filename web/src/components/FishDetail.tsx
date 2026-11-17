import { useId } from 'react';
import { COLLECTIONS, fishImage, isBackyard } from '../data';
import type { Fish, Unlock } from '../data/types';
import { altName, baitLabel, fishName, fmtNum, fmtRecord, fmtSeason, fmtSize, fmtTime, fruitLabel, itemName } from '../i18n/format';
import { useI18n } from '../i18n/context';
import { useModal } from '../hooks/useModal';
import type { FishProgress, ProgressField } from '../progress/schema';
import { Where } from './FishCard';
import { Stars } from './Stars';
import styles from './FishDetail.module.css';

type Props = {
  fish: Fish | null;
  state: FishProgress;
  areaName: (id: string) => string;
  /** Zone the catch times are shown in (fish.time is already shifted). */
  zoneName: string;
  onToggle: (id: string, field: ProgressField) => void;
  onClose: () => void;
};

function UnlockLine({ u }: { u: Unlock }) {
  const { lang, t } = useI18n();
  switch (u.kind) {
    case 'set': {
      const c = COLLECTIONS.find(x => x.id === u.set);
      return <>{t.unlockSet(c ? itemName(c, lang) : u.set)}</>;
    }
    case 'fossils': return <>{t.unlockFossils(u.name)}</>;
    case 'fruits': return (
      <>{t.unlockFruits}{' '}
        {u.fruits.map((f, i) => {
          const l = fruitLabel(f, lang);
          return <span key={i}>{i > 0 && ' → '}<span className={l.untranslated ? 'untranslated' : undefined}>{l.text}</span></span>;
        })}
      </>
    );
    case 'clubPoints': return <>{t.unlockClub(fmtNum(u.points, lang))}</>;
    case 'clubEarly': return <>{t.unlockEarly(fmtNum(u.coins, lang))}</>;
  }
}

export function FishDetail({ fish, state, areaName, zoneName, onToggle, onClose }: Props) {
  const ref = useModal(fish !== null, onClose);
  const titleId = useId();
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
      {fish && <Body fish={fish} state={state} areaName={areaName} zoneName={zoneName} onToggle={onToggle} titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function Body({ fish, state, areaName, zoneName, onToggle, titleId, onClose }: Omit<Props, 'fish'> & { fish: Fish; titleId: string }) {
  const { lang, t } = useI18n();
  const tm = fmtTime(fish.time, lang), se = fmtSeason(fish.season, lang);
  const rec = fmtRecord(fish.record);
  const name = fishName(fish, lang);
  return (
    <article className={styles.sheet} data-caught={state.caught} data-glow={state.caughtGlowing}>
      <button type="button" className={`icon-btn icon-btn--close ${styles.close}`} aria-label={t.close} onClick={onClose}>×</button>
      <header>
        <Stars r={fish.rarity} />
        {fish.rarer && <span className={`note ${styles.rarer}`}>{t.rarer(fish.rarer, fish.rarity)}</span>}
        <h2 id={titleId} className={styles.name}>{name}</h2>
        <p className={styles.alt} lang={lang === 'cs' ? 'en' : 'cs'}>{altName(fish, lang)}</p>
      </header>
      <figure className={styles.specimen}>
        <img
          src={fishImage(fish.id)} alt={name} width={fish.img.w} height={fish.img.h}
          style={{ maxWidth: fish.img.w * 2, maxHeight: fish.img.h * 2 }}
        />
        <span className={`stamp ${styles.stamp}`} aria-hidden="true">{t.stamp}</span>
      </figure>
      <div className={styles.actions}>
        <button type="button" className="toggle" aria-pressed={state.caught} onClick={() => onToggle(fish.id, 'caught')}>
          <span className="box" aria-hidden="true" />{t.tCaught}
        </button>
        <button type="button" className="toggle toggle--glow" aria-pressed={state.caughtGlowing} onClick={() => onToggle(fish.id, 'caughtGlowing')}>
          <span className="box" aria-hidden="true" />{t.tGlow}
        </button>
        {isBackyard(fish) && (
          <button type="button" className={`toggle ${styles.wide}`} aria-pressed={!!state.bred} onClick={() => onToggle(fish.id, 'bred')}>
            <span className="box" aria-hidden="true" />{t.tBred}
          </button>
        )}
      </div>
      <dl className={styles.facts}>
        <dt>{t.where}</dt>
        <dd><Where fish={fish} areaName={areaName} /></dd>
        <dt>{t.when}</dt>
        <dd className={tm.unknown ? styles.unknown : undefined}>
          {tm.text}{tm.overnight && <> <span className="note">{t.overnight}</span></>}
          {Array.isArray(fish.time) && <> <span className="note">({zoneName})</span></>}
        </dd>
        <dt>{t.season}</dt>
        <dd className={se.unknown ? styles.unknown : undefined}>{se.text}</dd>
        <dt>{t.bait}</dt>
        <dd>
          {fish.bait.map((b, i) => {
            const l = baitLabel(b, lang);
            return <span key={b}>{i > 0 && ', '}<span className={l.untranslated ? 'untranslated' : undefined}>{l.text}</span></span>;
          })}
        </dd>
        {fish.unlock && <>
          <dt>{t.unlock}</dt>
          <dd>{fish.unlock.map((u, i) => <span key={i} className={styles.line}><UnlockLine u={u} /></span>)}</dd>
        </>}
        {fish.breed && <>
          <dt>{t.breed}</dt>
          <dd>{t.breedText(fmtNum(fish.breed.cost, lang), fish.breed.hours, Math.round(fish.breed.chance * 100))}</dd>
        </>}
        <dt>{t.length}</dt>
        <dd className={fish.size ? undefined : styles.unknown}>
          {fmtSize(fish.size) ?? t.unknownF}{fish.size && <> <span className="note">{t.avgLen(fish.size.avg)}</span></>}
        </dd>
        <dt>{t.record}</dt>
        <dd className={rec ? undefined : styles.unknown}>
          {rec?.text ?? t.unknownF}{rec?.unsure && <abbr className="unsure" title={t.unsure}>?<span className="visually-hidden"> {t.unsure}</span></abbr>}
        </dd>
      </dl>
    </article>
  );
}
