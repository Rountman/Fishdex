import { useId, useRef, useState } from 'react';
import { FISH_IDS } from '../data';
import { fmtDate } from '../i18n/format';
import { useI18n } from '../i18n/context';
import { useModal } from '../hooks/useModal';
import { downloadProgress } from '../progress/download';
import { exportFileName, readImport, totals, type ImportPreview, type ImportResult } from '../progress/progress';
import type { Progress } from '../progress/schema';
import { UploadIcon } from './icons';
import styles from './BackupDialog.module.css';

type Props = {
  open: boolean;
  progress: Progress;
  onClose: () => void;
  onExported: () => void;
  onImport: (how: 'merge' | 'replace', incoming: ImportPreview) => void;
};

type Step = { kind: 'start' } | { kind: 'preview'; name: string; preview: ImportPreview } | { kind: 'error'; name: string; reason: Exclude<ImportResult, { ok: true }>['reason'] };

export function BackupDialog({ open, progress, onClose, onExported, onImport }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'start' });
  const close = () => { setStep({ kind: 'start' }); onClose(); };
  const ref = useModal(open, close);
  const titleId = useId();
  const file = useRef<HTMLInputElement>(null);
  const { lang, t } = useI18n();
  const s = totals(progress, FISH_IDS);

  const download = () => {
    downloadProgress(progress);
    onExported();
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const res = readImport(await f.text(), FISH_IDS);
    setStep(res.ok ? { kind: 'preview', name: f.name, preview: res.preview } : { kind: 'error', name: f.name, reason: res.reason });
  };

  const picker = (
    <>
      <input ref={file} type="file" accept="application/json,.json" hidden
        onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {step.kind === 'error' && (
        <div className={styles.error} role="alert">
          <p><strong>{t.imErr[step.reason]}</strong> {step.name}</p>
          <p>{t.imErrD}</p>
        </div>
      )}
      <button type="button" className={styles.pick} onClick={() => file.current?.click()}>
        <UploadIcon />
        <span><strong>{step.kind === 'error' ? t.otherFile : t.imPick}</strong><span>{t.imPickHint}</span></span>
      </button>
    </>
  );

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.body}>
        <button type="button" className={`icon-btn icon-btn--close ${styles.close}`} aria-label={t.close} onClick={close}>×</button>
        <h2 id={titleId}>{t.bTitle}</h2>
        <p className={styles.lead}>{t.bLead}</p>

        {step.kind !== 'preview' && (
          <section className={styles.part}>
            <h3>{t.exH}</h3>
            <p>{t.exSummary(s.caught, s.caughtGlowing, s.bred)}</p>
            <button type="button" className="btn" onClick={download}>{t.exBtn}</button>
            <p className={styles.file}>{exportFileName()}</p>
          </section>
        )}

        <section className={styles.part}>
          <h3>{t.imH}</h3>
          {step.kind === 'preview' ? (
            <>
              <dl className={styles.meta}>
                <dt>{t.imFile}</dt><dd>{step.name}</dd>
                {step.preview.savedAt && <><dt>{t.imSaved}</dt><dd>{fmtDate(step.preview.savedAt, lang)}</dd></>}
              </dl>
              <p className={styles.count}>{t.imFish(step.preview.count)}</p>
              <p className={styles.break}>{t.imBreak(step.preview.caught, step.preview.caughtGlowing, step.preview.bred)}</p>
              {step.preview.unknown > 0 && <p className={styles.warn}>{t.imUnknown(step.preview.unknown)}</p>}
              <p className={styles.how}>{t.imHow}</p>
              <div className={styles.choices}>
                <button type="button" className={styles.choice} onClick={() => { onImport('merge', step.preview); close(); }}>
                  <strong>{t.merge}</strong><span>{t.mergeD}</span>
                </button>
                <button type="button" className={`${styles.choice} ${styles.danger}`} onClick={() => { onImport('replace', step.preview); close(); }}>
                  <strong>{t.replace}</strong><span>{t.replaceD}</span>
                </button>
              </div>
              <input ref={file} type="file" accept="application/json,.json" hidden
                onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="link" onClick={() => file.current?.click()}>{t.otherFile}</button>
            </>
          ) : picker}
        </section>
      </div>
    </dialog>
  );
}
