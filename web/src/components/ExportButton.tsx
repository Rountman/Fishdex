import { useI18n } from '../i18n/context';
import { DownloadIcon } from './icons';
import styles from './ExportButton.module.css';

/** Always-visible export: one click saves the progress file, no dialog. */
export function ExportButton({ onExport }: { onExport: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className={styles.fab} onClick={onExport} aria-label={t.exportFab}>
      <DownloadIcon />
      <span className={styles.long} aria-hidden="true">{t.exportFab}</span>
      <span className={styles.short} aria-hidden="true">{t.exportFabShort}</span>
    </button>
  );
}
