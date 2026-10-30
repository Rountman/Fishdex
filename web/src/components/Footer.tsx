import { useI18n } from '../i18n/context';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className={styles.foot}>
      <p>{t.footer} <strong className={styles.handle}>rountman</strong></p>
    </footer>
  );
}
