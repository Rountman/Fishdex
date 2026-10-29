import { AnimatePresence, domAnimation, LazyMotion, m } from 'motion/react';
import { useEffect } from 'react';
import { useI18n } from '../i18n/context';
import styles from './Toast.module.css';

export type ToastData = { id: number; text: string; undo?: () => void };

const DURATION = 5000;

/** One toast at a time; a new action replaces the previous one and restarts the 5 s. */
export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDone, DURATION);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {/* one at a time: the leaving toast must not offer a stale "Vrátit" */}
      <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="wait">
        {toast && (
          <m.div
            key={toast.id} className={styles.toast}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, pointerEvents: 'none' }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span>{toast.text}</span>
            {toast.undo && <button type="button" onClick={() => { toast.undo!(); onDone(); }}>{t.undo}</button>}
          </m.div>
        )}
      </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
