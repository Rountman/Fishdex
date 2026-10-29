import { createContext, useContext } from 'react';
import { STRINGS, type Lang, type Strings } from './strings';

export type I18n = { lang: Lang; t: Strings };
export const I18nContext = createContext<I18n>({ lang: 'cs', t: STRINGS.cs });
export const useI18n = () => useContext(I18nContext);
