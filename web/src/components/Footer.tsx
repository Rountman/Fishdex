import { useId, useState } from 'react';
import { useI18n } from '../i18n/context';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <footer className={styles.foot}>
      <p>{t.footer} <strong className={styles.handle}>rountman</strong></p>
      <p>
        <button type="button" className="link" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{t.privacyLink}</button>
      </p>
      <div id={id} className={styles.privacy} hidden={!open}>
        <p>{t.privacyServer}</p>
        <p>{t.privacyLocal}</p>
      </div>
    </footer>
  );
}
