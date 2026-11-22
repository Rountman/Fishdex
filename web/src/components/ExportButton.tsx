import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/context';
import { DownloadIcon } from './icons';
import styles from './ExportButton.module.css';

/** Scrolled further than this (px) in one direction before the button reacts. */
const SLACK = 24;
/** Above this the masthead (with its own "Záloha") is on screen. */
const TOP = 240;

/**
 * One click saves the progress file, no dialog.
 * A pinned button over a card grid always covers some card's corner ("Zápis"), so it
 * only shows when it is needed: on the first scroll up and at the end of the page.
 * At the top the masthead already offers "Záloha"; scrolling down hides it again.
 */
export function ExportButton({ onExport }: { onExport: () => void }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const end = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      if (y < TOP) setHidden(true);
      else if (end) setHidden(false);
      else if (y > last + SLACK) setHidden(true);
      else if (y < last - SLACK) setHidden(false);
      else return;
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  return (
    <button type="button" className={styles.fab} data-hidden={hidden} onClick={onExport} aria-label={t.exportFab}>
      <DownloadIcon />
      <span className={styles.long} aria-hidden="true">{t.exportFab}</span>
      <span className={styles.short} aria-hidden="true">{t.exportFabShort}</span>
    </button>
  );
}
