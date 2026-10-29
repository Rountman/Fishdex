import type { ReactNode } from 'react';
import { I18nContext } from './context';
import { STRINGS, type Lang } from './strings';

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <I18nContext value={{ lang, t: STRINGS[lang] }}>{children}</I18nContext>;
}
