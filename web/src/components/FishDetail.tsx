import { useId } from 'react';
import { fishImage, isBackyard } from '../data';
import type { Fish, UncertainField } from '../data/types';
import { altName, baitLabel, fishName, fmtSeason, fmtSize, fmtTime } from '../i18n/format';
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
  onToggle: (id: string, field: ProgressField) => void;
  onClose: () => void;
};

function Unsure({ fish, field }: { fish: Fish; field: UncertainField }) {
  const { t } = useI18n();
  if (!fish.uncertain.includes(field)) return null;
  return <abbr className="unsure" title={t.unsure}>?<span className="visually-hidden"> {t.unsure}</span></abbr>;
}

export function FishDetail({ fish, state, areaName, onToggle, onClose }: Props) {
  const ref = useModal(fish !== null, onClose);
  const titleId = useId();
  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
      {fish && <Body fish={fish} state={state} areaName={areaName} onToggle={onToggle} titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function Body({ fish, state, areaName, onToggle, titleId, onClose }: Omit<Props, 'fish'> & { fish: Fish; titleId: string }) {
  const { lang, t } = useI18n();
  const tm = fmtTime(fish.time, lang), se = fmtSeason(fish.season, lang);
  const name = fishName(fish, lang);
  return (
    <article className={styles.sheet} data-caught={state.caught} data-glow={state.caughtGlowing}>
      <button type="button" className={`icon-btn icon-btn--close ${styles.close}`} aria-label={t.close} onClick={onClose}>×</button>
      <header>
        <Stars r={fish.rarity} />
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
          {tm.text}{tm.overnight && <> <span className="note">{t.overnight}</span></>}<Unsure fish={fish} field="time" />
        </dd>
        <dt>{t.season}</dt>
        <dd className={se.unknown ? styles.unknown : undefined}>{se.text}<Unsure fish={fish} field="season" /></dd>
        <dt>{t.bait}</dt>
        <dd>
          {fish.bait.map((b, i) => {
            const l = baitLabel(b, lang);
            return <span key={b}>{i > 0 && ', '}<span className={l.untranslated ? 'untranslated' : undefined}>{l.text}</span></span>;
          })}
          <Unsure fish={fish} field="bait" />
        </dd>
        <dt>{t.length}</dt>
        <dd className={fish.size ? undefined : styles.unknown}>
          {fmtSize(fish.size) ?? t.unknownF}{fish.size && <> <span className="note">{t.avgLen(fish.size.avg)}</span></>}
        </dd>
        <dt>{t.record}</dt>
        <dd className={fish.record ? undefined : styles.unknown}>{fish.record ?? t.unknownF}</dd>
      </dl>
    </article>
  );
}
