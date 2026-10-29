// Small per-browser preferences: language, theme, backup hint. Same safety rules as
// progress: every access guarded, missing storage just means defaults.
import { useCallback, useState } from 'react';
import type { Lang } from '../i18n/strings';
import { browserStorage } from '../progress/storage';

export const PREFS_KEY = 'fishdex:prefs:v1';

export type Theme = 'auto' | 'light' | 'dark';

export type Prefs = {
  lang: Lang;
  theme: Theme;
  /** "Už neukazovat": the backup hint never shows again. */
  hintDismissed: boolean;
  /** Caught count when the hint was last closed or a backup was made. */
  hintAckAt: number;
};

const defaults = (): Prefs => ({
  lang: typeof navigator !== 'undefined' && !navigator.language?.toLowerCase().startsWith('cs') &&
    !navigator.language?.toLowerCase().startsWith('sk') ? 'en' : 'cs',
  theme: 'auto',
  hintDismissed: false,
  hintAckAt: 0,
});

export function loadPrefs(): Prefs {
  const d = defaults();
  try {
    const raw = browserStorage()?.getItem(PREFS_KEY);
    if (!raw) return d;
    const v = JSON.parse(raw) as Partial<Prefs>;
    return {
      lang: v.lang === 'cs' || v.lang === 'en' ? v.lang : d.lang,
      theme: v.theme === 'light' || v.theme === 'dark' ? v.theme : 'auto',
      hintDismissed: v.hintDismissed === true,
      hintAckAt: typeof v.hintAckAt === 'number' && v.hintAckAt >= 0 ? v.hintAckAt : 0,
    };
  } catch {
    return d;
  }
}

function savePrefs(p: Prefs) {
  try { browserStorage()?.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* defaults next time */ }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs(p => { const next = { ...p, ...patch }; savePrefs(next); return next; });
  }, []);
  return [prefs, update] as const;
}

/** First after ~20 caught fish, then again every 50 more, until dismissed for good. */
export const HINT_FIRST = 20;
export const HINT_EVERY = 50;
export const shouldShowHint = (caught: number, p: Pick<Prefs, 'hintDismissed' | 'hintAckAt'>) =>
  !p.hintDismissed && caught >= HINT_FIRST && caught >= (p.hintAckAt === 0 ? HINT_FIRST : p.hintAckAt + HINT_EVERY);
