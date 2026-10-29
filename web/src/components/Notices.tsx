import { useI18n } from '../i18n/context';
import styles from './Notices.module.css';

export function BackupHint({ onExport, onLater, onDismiss }: { onExport: () => void; onLater: () => void; onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className={styles.hint} role="note">
      <p>{t.hint}</p>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onExport}>{t.exportNow}</button>
        <button type="button" className="link" onClick={onLater}>{t.later}</button>
        <button type="button" className="link" onClick={onDismiss}>{t.dontShow}</button>
      </div>
    </div>
  );
}

export function StorageNotice({ kind, onBackup }: { kind: 'off' | 'blocked' | 'recovered'; onBackup: () => void }) {
  const { t } = useI18n();
  const text = kind === 'off' ? t.storageOff : kind === 'blocked' ? t.blocked : t.recovered;
  return (
    <p className={styles.notice} role="status">
      {text}
      {kind === 'off' && <> <button type="button" className="link" onClick={onBackup}>{t.storageAction}</button></>}
    </p>
  );
}
