import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../i18n/context';
import { pct } from '../i18n/format';
import type { Lang } from '../i18n/strings';
import { citiesByOffset } from '../time/cities';
import { DEVICE_ZONE, fixedOffset, offsetLabel, pickerValue, ZONE_CHOICES, type ZonePref } from '../time/zone';
import { SettingsIcon } from './icons';
import styles from './Masthead.module.css';

import { TABS, type Tab } from '../state/tabs';

export type { Tab };
export type FurnitureTally = { owned: number; total: number; setsDone: number; sets: number };

type Props = {
  total: number;
  caught: number;
  glow: number;
  dark: boolean;
  onLang: (l: Lang) => void;
  onTheme: () => void;
  onBackup: () => void;
  tab: Tab;
  onTab: (tab: Tab) => void;
  furniture: FurnitureTally;
  zone: ZonePref;
  onZone: (zone: ZonePref) => void;
  /** Moment the offsets and example cities are taken for (page load). */
  zoneAt: number;
  /** Fish tab: the tally opens the per-area overview. */
  onOverview: () => void;
  overview: boolean;
  /** Phone layout: language, zone, theme and backup fold into one "Nastavení" menu. */
  mobile: boolean;
};

export function Masthead({ total, caught, glow, dark, onLang, onTheme, onBackup, tab, onTab, furniture: fu, zone, onZone, zoneAt, onOverview, overview, mobile }: Props) {
  const { lang, t } = useI18n();
  const cities = useMemo(() => citiesByOffset(lang, zoneAt), [lang, zoneAt]);
  const value = pickerValue(zone, zoneAt);
  const zoneText = (z: ZonePref) => {
    if (z === DEVICE_ZONE) return t.tzDevice;
    const m = fixedOffset(z);
    if (m === null) return z;
    const names = m === 0 ? [t.tzGame, ...(cities.get(0) ?? []).slice(0, 2)] : cities.get(m) ?? [];
    return names.length ? `${offsetLabel(m)} (${names.join(', ')})` : offsetLabel(m);
  };
  const complete = tab === 'fish' && total > 0 && caught === total;
  const menu = useRef<HTMLDetailsElement>(null);
  // the settings menu closes on Escape and on a tap outside it
  useEffect(() => {
    if (!mobile) return;
    const close = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        d.open = false;
        d.querySelector('summary')?.focus();
      } else if (!d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [mobile]);

  const tools = (
    <div className={styles.tools}>
      <div className={styles.lang} role="group" aria-label={t.langLabel}>
        {(['cs', 'en'] as const).map(l => (
          <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onLang(l)}>
            {l === 'cs' ? 'CZ' : 'EN'}
          </button>
        ))}
      </div>
      <label className={styles.zone}>
        <span aria-hidden="true">{t.zoneShort}</span>
        <select value={value} aria-label={t.zoneLabel} onChange={e => onZone(e.target.value)}>
          {!ZONE_CHOICES.includes(value) && <option value={value}>{zoneText(value)}</option>}
          {ZONE_CHOICES.map(z => <option key={z} value={z}>{zoneText(z)}</option>)}
        </select>
      </label>
      <button type="button" className="link" onClick={onTheme}>{dark ? t.themeToLight : t.themeToDark}</button>
      <button type="button" className="link" onClick={() => { if (menu.current) menu.current.open = false; onBackup(); }}>{t.backup}</button>
    </div>
  );
  return (
    <header className={styles.head}>
      <div className={styles.title}>
        <h1>Fishdex</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <div className={styles.tallyWrap}>
        {tab === 'timers' || tab === 'current' || tab === 'breeders' ? null : tab === 'furniture' ? (
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
        <button
          type="button" className={`${styles.tally} ${styles.tallyBtn}`} onClick={onOverview}
          aria-current={overview ? 'page' : undefined}
          aria-label={t.ovOpenAria(caught, glow, total)}
        >
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
          <span className={styles.go} aria-hidden="true">{t.ovOpen} <span className={styles.arrow}>→</span></span>
        </button>
        )}
        {complete && (
          <p className={styles.complete}>
            <span className={`stamp ${styles.bigStamp}`} aria-hidden="true">{t.complete}</span>
            <span className={styles.completeText}>{t.completeText(total, glow)}</span>
          </p>
        )}
      </div>

      {mobile ? (
        <details className={styles.menu} ref={menu}>
          <summary className={styles.menuBtn}><SettingsIcon />{t.settings}</summary>
          <div className={styles.menuPanel}>{tools}</div>
        </details>
      ) : tools}

      <nav className={styles.tabs} aria-label={t.tabsLabel}>
        {TABS.map(k => (
          <button key={k} type="button" className={styles.tab} aria-current={tab === k ? 'page' : undefined} onClick={() => onTab(k)}>
            {{ fish: t.tabFish, current: t.tabCurrent, furniture: t.tabFurniture, timers: t.tabTimers, breeders: t.tabBreeders }[k]}
          </button>
        ))}
      </nav>
    </header>
  );
}
