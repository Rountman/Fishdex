import { useI18n } from '../i18n/context';
import { pct } from '../i18n/format';
import type { Lang } from '../i18n/strings';
import styles from './Masthead.module.css';

export type Tab = 'fish' | 'furniture';
export type FurnitureTally = { owned: number; total: number; setsDone: number; sets: number };

type Props = {
  total: number;
  caught: number;
  glow: number;
  overviewOpen: boolean;
  dark: boolean;
  onOverview: () => void;
  onLang: (l: Lang) => void;
  onTheme: () => void;
  onBackup: () => void;
  tab: Tab;
  onTab: (tab: Tab) => void;
  furniture: FurnitureTally;
};

export function Masthead({ total, caught, glow, overviewOpen, dark, onOverview, onLang, onTheme, onBackup, tab, onTab, furniture: fu }: Props) {
  const { lang, t } = useI18n();
  const complete = tab === 'fish' && total > 0 && caught === total;
  return (
    <header className={styles.head}>
      <div className={styles.title}>
        <h1>Fishdex</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <div className={styles.tallyWrap}>
        {tab === 'furniture' ? (
          <div className={styles.tally}>
            <span className={styles.item}>
              <span className={styles.num}>{fu.owned}<span className="of">/{fu.total}</span></span>
              <span className={styles.label}>{t.ownedLabel} <span className="of">{pct(fu.owned / fu.total * 100, lang)}</span></span>
              <span className="bar"><span style={{ width: `${fu.owned / fu.total * 100}%` }} /></span>
            </span>
            <span className={styles.item}>
              <span className={styles.num}>{fu.setsDone}<span className="of">/{fu.sets}</span></span>
              <span className={styles.label}>{t.setsDoneLabel}</span>
              <span className="bar bar--bred"><span style={{ width: `${fu.setsDone / fu.sets * 100}%` }} /></span>
            </span>
          </div>
        ) : (
        <button type="button" className={styles.tally} aria-pressed={overviewOpen} onClick={onOverview}>
          <span className={styles.item}>
            <span className={styles.num}>{caught}<span className="of">/{total}</span></span>
            <span className={styles.label}>{t.caughtLabel} <span className="of">{pct(caught / total * 100, lang)}</span></span>
            <span className="bar"><span style={{ width: `${caught / total * 100}%` }} /></span>
          </span>
          <span className={styles.item}>
            <span className={styles.num}>{glow}<span className="of">/{total}</span></span>
            <span className={styles.label}>{t.glowLabel} <span className="of">{pct(glow / total * 100, lang)}</span></span>
            <span className="bar bar--glow"><span style={{ width: `${glow / total * 100}%` }} /></span>
          </span>
          <span className={styles.link}>{t.overview}</span>
        </button>
        )}
        {complete && (
          <p className={styles.complete}>
            <span className={`stamp ${styles.bigStamp}`} aria-hidden="true">{t.complete}</span>
            <span className={styles.completeText}>{t.completeText(total, glow)}</span>
          </p>
        )}
      </div>

      <div className={styles.tools}>
        <div className={styles.lang} role="group" aria-label={t.langLabel}>
          {(['cs', 'en'] as const).map(l => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onLang(l)}>
              {l === 'cs' ? 'CZ' : 'EN'}
            </button>
          ))}
        </div>
        <button type="button" className="link" onClick={onTheme}>{dark ? t.themeToLight : t.themeToDark}</button>
        <button type="button" className="link" onClick={onBackup}>{t.backup}</button>
      </div>

      <nav className={styles.tabs} aria-label={t.tabsLabel}>
        {(['fish', 'furniture'] as const).map(k => (
          <button key={k} type="button" className={styles.tab} aria-current={tab === k ? 'page' : undefined} onClick={() => onTab(k)}>
            {k === 'fish' ? t.tabFish : t.tabFurniture}
          </button>
        ))}
      </nav>
    </header>
  );
}
