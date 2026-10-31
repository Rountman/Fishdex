// Formatting of data values for display. Unknown stays "unknown", never a guess.
import type { Availability, Fish, FurnitureRarity, MonthRange, Schedule } from '../data/types';
import { BAITS, SPOTS, type Bait, type Spot } from './dictionaries';
import { STRINGS, type Lang } from './strings';

export type Formatted = { text: string; unknown?: boolean; overnight?: boolean };

const hm = (s: string) => s.replace(/^0/, '');

export function fmtTime(time: Schedule, lang: Lang): Formatted {
  const t = STRINGS[lang];
  if (time === null) return { text: t.unknownF, unknown: true };
  if (time === 'always') return { text: t.anyTime };
  return {
    text: time.map(w => `${hm(w.from)}–${hm(w.to)}`).join(', '),
    // 18:00–00:00 ends exactly at midnight, it does not cross it
    overnight: time.some(w => w.from > w.to && w.to !== '00:00'),
  };
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (s: string, lang: Lang) => {
  const [m, d] = s.split('-').map(Number);
  return lang === 'cs' ? `${d}. ${m}.` : `${d} ${MON[m - 1]}`;
};

export function fmtSeason(season: Schedule, lang: Lang): Formatted {
  const t = STRINGS[lang];
  if (season === null) return { text: t.unknownF, unknown: true };
  if (season === 'always') return { text: t.allYear };
  return { text: season.map(w => `${dm(w.from, lang)}–${dm(w.to, lang)}`).join(', ') };
}

/** Catch length range: "24–58 cm", or "58 cm" when min = max. */
export function fmtSize(size: Fish['size']): string | null {
  if (!size) return null;
  return size.min === size.max ? `${size.max} cm` : `${size.min}–${size.max} cm`;
}

/** World record label; the source marks an uncertain one as "(118–119 cm)?". */
export function fmtRecord(record: string | null): { text: string; unsure: boolean } | null {
  if (!record) return null;
  const m = /^\((.+)\)\?$/.exec(record);
  return m ? { text: m[1], unsure: true } : { text: record, unsure: false };
}

export const fishName = (f: Fish, lang: Lang) => f.names[lang];
export const altName = (f: Fish, lang: Lang) => f.names[lang === 'cs' ? 'en' : 'cs'];

/** `untranslated` = no Czech source, shown in English (italics). */
export function baitLabel(b: Bait, lang: Lang) {
  const l = BAITS[b];
  return { text: (lang === 'cs' ? l.cs : null) ?? l.en, untranslated: lang === 'cs' && l.cs === null };
}

/** Czech one-letter prepositions must not end a line ("z mola"). */
const nbsp = (s: string) => s.replace(/(^|\s)([zvksuoai]) /gi, '$1$2 ');

export function spotLabel(s: Spot, lang: Lang) {
  const l = SPOTS[s];
  const text = (lang === 'cs' ? l.cs : null) ?? l.en;
  return { text: lang === 'cs' ? nbsp(text) : text, untranslated: lang === 'cs' && l.cs === null };
}

export const pct = (n: number, lang: Lang) =>
  lang === 'cs' ? `${n.toFixed(1).replace('.', ',')} %` : `${n.toFixed(1)}%`;

export const fmtDate = (d: Date, lang: Lang) =>
  lang === 'cs' ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;

// ---- furniture

export const itemName = (x: { names: { cs: string; en: string } }, lang: Lang) => x.names[lang];

export function fmtAvailability(a: Availability | null, lang: Lang): Formatted {
  const t = STRINGS[lang];
  if (!a) return { text: t.unknownF, unknown: true };
  return { text: a.kind === 'level' ? t.avail.level(a.level) : t.avail[a.kind] };
}

/** Shop months; `null` for "all year" (not worth a line on the card) – unknown is "neznámé". */
export function fmtMonths(season: MonthRange | 'always' | null, lang: Lang): Formatted | null {
  const t = STRINGS[lang];
  if (season === 'always') return null;
  if (season === null) return { text: t.unknownF, unknown: true };
  return { text: t.monthRange(t.months[season.from - 1], t.months[season.to - 1]) };
}

/** Rarity colour tier 1–5 (same tokens as fish stars); the label text always goes with it. */
export const RARITY_TIER: Record<FurnitureRarity, 1 | 2 | 3 | 4 | 5> = {
  'very-common': 1, common: 1, normal: 1, uncommon: 2, rare: 3, 'very-rare': 3, epic: 4, legendary: 5,
};
