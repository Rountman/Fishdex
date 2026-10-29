// UI strings and data formatters for CZ / EN.
import { BAIT_CS, SPOT_CS } from '../shared/data.js';

export const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'cs';
document.documentElement.lang = lang;

const plural = (n, one, few, many) => n === 1 ? one : n >= 2 && n <= 4 ? few : many;

const S = {
  cs: {
    subtitle: 'Rybářský deník Fishao',
    theme: 'Světlo / tma',
    backup: 'Záloha',
    overview: 'Přehled oblastí',
    indexTitle: 'Obsah deníku',
    allAreas: 'Všechny oblasti',
    kinds: { area: 'Oblasti', tournament: 'Turnaje', backyard: 'Za domem' },
    caughtLabel: 'ulovených ryb',
    glowLabel: 'zářivých',
    searchLabel: 'Hledat rybu',
    searchPh: 'Jméno ryby, česky i anglicky',
    rarity: 'Rarita', status: 'Stav',
    statusAll: 'Vše', uncaught: 'Chybí', caught: 'Ulovené', noglow: 'Chybí zářivá',
    bait: 'Návnada', baitAny: 'všechny', baitN: n => `${n} vybrané`,
    baitHint: 'Ukáže ryby, které berou aspoň jednu z vybraných návnad. Číslo = počet ryb.',
    clearSel: 'Zrušit výběr', done: 'Hotovo',
    area: 'Oblast',
    yard: 'Za domem', yardHave: 'Mám', yardNot: 'Nemám',
    filters: 'Filtry', showN: n => `Zobrazit ${n} ${plural(n, 'rybu', 'ryby', 'ryb')}`,
    clearAll: 'Zrušit vše',
    removeFilter: l => `Zrušit filtr ${l}`,
    count: (n, t) => n === t ? `${n} ${plural(n, 'ryba', 'ryby', 'ryb')}` : `${n} z ${t}`,
    hint: 'Progres je jen v tomto prohlížeči. Exportuj si zálohu, ať o něj nepřijdeš.',
    exportNow: 'Exportovat', dontShow: 'Už neukazovat',
    storageOff: 'Tenhle prohlížeč nedovolí ukládat (soukromé okno nebo blokované úložiště). Odškrtávání funguje, ale po zavření stránky zmizí.',
    storageAction: 'Stáhnout zálohu',
    stamp: 'Uloveno',
    lenUnknown: 'délka neznámá',
    open: 'Zápis', openFor: n => ` o rybě ${n}`,
    bredNote: 'mám za domem',
    cardAria: (n, c) => `${n}: ${c ? 'ulovena' : 'neulovena'}. Klik přepne ulovení, Shift+klik zářivou.`,
    glowAria: c => `Zářivá varianta: ${c ? 'ulovena' : 'neulovena'}`,
    bredAria: c => `Za domem: ${c ? 'mám' : 'nemám'}`,
    rarityAria: r => `rarita ${r} z 5`,
    unsure: 'Nejisté: zdroje se liší',
    where: 'Kde', when: 'Kdy', season: 'Sezóna', length: 'Délka', unknownF: 'neznámá',
    overnight: 'přes půlnoc',
    tCaught: 'Ulovena', tGlow: 'Zářivá ulovena', tBred: 'Mám za domem', close: 'Zavřít',
    emptyTitle: 'Na téhle stránce nic.',
    emptyQuery: q => `Hledání „${q}“ nenašlo žádnou rybu.`,
    emptyFilters: 'Žádná ryba neodpovídá zvoleným filtrům.',
    emptyTip: 'Zkontroluj překlep, zkus anglický název, nebo zruš filtry.',
    clearFilters: 'Zrušit hledání a filtry',
    complete: 'Deník kompletní',
    completeText: (t, g) => `Všech ${t} ryb je ulovených.` + (g < t ? ` Zářivých zbývá ${t - g}.` : ' I všechny zářivé.'),
    toast: (n, field, on) => field === 'caught' ? `${n}: ${on ? 'zapsána jako ulovená' : 'ulovení smazáno'}`
      : field === 'bred' ? `${n}: ${on ? 'zapsána za domem' : 'odebrána ze zápisu za domem'}`
      : `${n}: ${on ? 'zapsána zářivá' : 'zářivá smazána'}`,
    undo: 'Vrátit',
    ovTitle: 'Přehled oblastí', ovBack: 'Zpět na ryby',
    ovTotal: 'Celkem', ovCaught: 'Ulovené', ovGlow: 'Zářivé', ovBred: 'Za domem',
    ovHint: 'Klikni na oblast a zobrazí se její ryby.',
    stickers: 'Stavy karty',
    // backup dialog
    bTitle: 'Záloha progresu',
    bLead: 'Progres je uložený jen v tomto prohlížeči. Záloha je obyčejný soubor, který si můžeš nahrát zpátky tady nebo na jiném zařízení.',
    exH: 'Stáhnout zálohu',
    exSummary: (c, g, b) => `${c} ${plural(c, 'ulovená ryba', 'ulovené ryby', 'ulovených ryb')}, ${g} zářivých, ${b} za domem`,
    exBtn: 'Stáhnout soubor',
    imH: 'Nahrát zálohu',
    imPick: 'Vybrat soubor zálohy',
    imPickHint: 'Soubor .json stažený přes „Stáhnout soubor“.',
    imFile: 'Soubor', imSaved: 'Uloženo',
    imFish: n => `${n} ${plural(n, 'ryba', 'ryby', 'ryb')}`,
    imBreak: (c, g, b) => `${c} ulovených, ${g} zářivých, ${b} za domem`,
    imUnknown: n => `${n} ${plural(n, 'ryba', 'ryby', 'ryb')} ze souboru v datech není. Zůstanou uložené, jen se nezobrazí.`,
    imHow: 'Co s ním udělat?',
    merge: 'Sloučit', mergeD: 'Ponechá tvůj progres a přidá, co je navíc v souboru. Nic se neodškrtne.',
    replace: 'Nahradit', replaceD: 'Smaže současný progres a nahradí ho obsahem souboru.',
    cancel: 'Zrušit', otherFile: 'Vybrat jiný soubor',
    imErr: 'Tohle není záloha Fishdexu.',
    imErrD: 'V souboru chybí položky „version“ a „fish“. Vyber soubor stažený tlačítkem „Stáhnout soubor“.',
    merged: n => `Sloučeno: ${n} ${plural(n, 'ryba', 'ryby', 'ryb')} ze zálohy`,
    replaced: n => `Nahrazeno: progres obsahuje ${n} ${plural(n, 'rybu', 'ryby', 'ryb')}`,
  },
  en: {
    subtitle: 'Fishao angler’s journal',
    theme: 'Light / dark',
    backup: 'Backup',
    overview: 'Area overview',
    indexTitle: 'Contents',
    allAreas: 'All areas',
    kinds: { area: 'Areas', tournament: 'Tournaments', backyard: 'Backyard' },
    caughtLabel: 'fish caught',
    glowLabel: 'glowing',
    searchLabel: 'Search fish',
    searchPh: 'Fish name, English or Czech',
    rarity: 'Rarity', status: 'Status',
    statusAll: 'All', uncaught: 'Missing', caught: 'Caught', noglow: 'Glowing missing',
    bait: 'Bait', baitAny: 'any', baitN: n => `${n} selected`,
    baitHint: 'Shows fish that take at least one of the selected baits. Number = fish count.',
    clearSel: 'Clear', done: 'Done',
    area: 'Area',
    yard: 'Backyard', yardHave: 'Have', yardNot: 'Don’t have',
    filters: 'Filters', showN: n => `Show ${n} fish`,
    clearAll: 'Clear all',
    removeFilter: l => `Remove filter ${l}`,
    count: (n, t) => n === t ? `${n} fish` : `${n} of ${t}`,
    hint: 'Your progress lives only in this browser. Export a backup so you don’t lose it.',
    exportNow: 'Export', dontShow: 'Don’t show again',
    storageOff: 'This browser blocks saving (private window or blocked storage). Checking fish works, but it’s gone when you close the page.',
    storageAction: 'Download backup',
    stamp: 'Caught',
    lenUnknown: 'length unknown',
    open: 'Entry', openFor: n => ` for ${n}`,
    bredNote: 'in my backyard',
    cardAria: (n, c) => `${n}: ${c ? 'caught' : 'not caught'}. Click toggles caught, Shift+click glowing.`,
    glowAria: c => `Glowing variant: ${c ? 'caught' : 'not caught'}`,
    bredAria: c => `Backyard: ${c ? 'have it' : 'don’t have it'}`,
    rarityAria: r => `rarity ${r} of 5`,
    unsure: 'Uncertain: sources disagree',
    where: 'Where', when: 'Time', season: 'Season', length: 'Length', unknownF: 'unknown',
    overnight: 'past midnight',
    tCaught: 'Caught', tGlow: 'Glowing caught', tBred: 'In my backyard', close: 'Close',
    emptyTitle: 'Nothing on this page.',
    emptyQuery: q => `No fish matches “${q}”.`,
    emptyFilters: 'No fish matches the selected filters.',
    emptyTip: 'Check for a typo, try the Czech name, or clear the filters.',
    clearFilters: 'Clear search and filters',
    complete: 'Journal complete',
    completeText: (t, g) => `All ${t} fish caught.` + (g < t ? ` ${t - g} glowing left.` : ' Every glowing one too.'),
    toast: (n, field, on) => field === 'caught' ? `${n}: ${on ? 'marked caught' : 'unmarked'}`
      : field === 'bred' ? `${n}: ${on ? 'marked in backyard' : 'removed from backyard'}`
      : `${n}: ${on ? 'glowing marked' : 'glowing unmarked'}`,
    undo: 'Undo',
    ovTitle: 'Area overview', ovBack: 'Back to fish',
    ovTotal: 'Total', ovCaught: 'Caught', ovGlow: 'Glowing', ovBred: 'Backyard',
    ovHint: 'Click an area to see its fish.',
    stickers: 'Card states',
    bTitle: 'Progress backup',
    bLead: 'Progress is stored only in this browser. A backup is a plain file you can load back here or on another device.',
    exH: 'Download backup',
    exSummary: (c, g, b) => `${c} caught, ${g} glowing, ${b} in backyard`,
    exBtn: 'Download file',
    imH: 'Load backup',
    imPick: 'Choose backup file',
    imPickHint: 'A .json file saved with “Download file”.',
    imFile: 'File', imSaved: 'Saved',
    imFish: n => `${n} fish`,
    imBreak: (c, g, b) => `${c} caught, ${g} glowing, ${b} in backyard`,
    imUnknown: n => `${n} fish in the file are not in the data. They stay saved but aren’t shown.`,
    imHow: 'What should happen?',
    merge: 'Merge', mergeD: 'Keeps your progress and adds what the file has extra. Nothing gets unchecked.',
    replace: 'Replace', replaceD: 'Deletes current progress and uses the file instead.',
    cancel: 'Cancel', otherFile: 'Choose another file',
    imErr: 'This isn’t a Fishdex backup.',
    imErrD: 'The file has no “version” and “fish” entries. Choose a file saved with “Download file”.',
    merged: n => `Merged: ${n} fish from the backup`,
    replaced: n => `Replaced: progress now has ${n} fish`,
  },
};
export const t = S[lang];

export const name = f => lang === 'en' ? f.names.en : f.names.cs;
export const altName = f => lang === 'en' ? f.names.cs : f.names.en;
export const altLang = lang === 'en' ? 'cs' : 'en';

export const bait = b => lang === 'cs' ? BAIT_CS[b] ?? b : b;
export const baitTranslated = b => lang === 'en' || b in BAIT_CS;
// Czech one-letter prepositions must not end a line ("z\u00a0mola")
export const spot = s => lang === 'cs' ? (SPOT_CS[s] ?? s).replace(/\b([zvksuoaiZVKSUOAI]) /g, '$1\u00a0') : s.toLowerCase();

const hm = s => s.replace(/^0/, '');
export function fmtTime(time) {
  if (time === null) return { text: t.unknownF, unknown: true };
  if (time === 'always') return { text: lang === 'cs' ? 'kdykoliv' : 'any time' };
  return {
    text: time.map(w => `${hm(w.from)}–${hm(w.to)}`).join(', '),
    overnight: time.some(w => w.from > w.to && w.to !== '00:00'),
  };
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = s => { const [m, d] = s.split('-'); return lang === 'cs' ? `${+d}. ${+m}.` : `${+d} ${MON[m - 1]}`; };
export function fmtSeason(season) {
  if (season === null) return { text: t.unknownF, unknown: true };
  if (season === 'always') return { text: lang === 'cs' ? 'celý rok' : 'all year' };
  return { text: season.map(w => `${dm(w.from)}–${dm(w.to)}`).join(', ') };
}
export const pct = n => lang === 'cs' ? `${n.toFixed(1).replace('.', ',')} %` : `${n.toFixed(1)}%`;
export const date = d => lang === 'cs' ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
