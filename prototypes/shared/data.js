// Shared sample loader for the design prototypes. Reads the real data/ files
// (serve the repo root, e.g. `python3 -m http.server`), never invents values.

// 40 fish: mix of rarities plus the edge cases the prototypes must show.
export const SAMPLE_IDS = [
  // 1★
  'blue-tang', 'bluegill', 'brook-trout', 'glasseye-snapper', 'alpine-bullhead',
  // 2★
  'common-carp', 'achilles-tang', 'cherry-salmon', 'bluestripe-snapper', 'graysby', 'bitterling', 'allis-shad',
  // 3★
  'arctic-char', 'eel', 'grass-carp', 'flathead-catfish', 'blacktip-reef-shark', 'nassau-grouper',
  'atlantic-mackerel', 'french-grunt', 'asp',
  // 4★
  'spotted-tiger-shovelnose-catfish', 'redfin-pickerel', 'giant-moray', 'nurse-shark', 'bighead-carp',
  'horn-shark', 'moorish-idol', 'banggai-cardinalfish', 'amazon-leaf-fish',
  // 5★
  'arapaima', 'golden-gar', 'shortdorsal-cutthroat-eel', 'albino-catfish', 'humpback-anglerfish',
  'apache-trout', 'fire-eel', 'alligator-gar', 'pelican-eel', 'stareater',
];

// Demo progress so every card state is visible on first load.
export const DEMO_PROGRESS = {
  'blue-tang': { caught: true, caughtGlowing: false },
  'common-carp': { caught: true, caughtGlowing: true },
  'arapaima': { caught: true, caughtGlowing: true },
  'giant-moray': { caught: false, caughtGlowing: true },
  'eel': { caught: true, caughtGlowing: false },
  'bluegill': { caught: true, caughtGlowing: false },
  'grass-carp': { caught: true, caughtGlowing: false },
  'moorish-idol': { caught: true, caughtGlowing: true },
  'achilles-tang': { caught: true, caughtGlowing: false },
  'redfin-pickerel': { caught: true, caughtGlowing: false },
  'nassau-grouper': { caught: false, caughtGlowing: true },
  'cherry-salmon': { caught: true, caughtGlowing: false },
  'french-grunt': { caught: true, caughtGlowing: false },
  'fire-eel': { caught: true, caughtGlowing: false, bred: true },
  'apache-trout': { caught: true, caughtGlowing: false },
};

export async function loadSample(base = '../../') {
  const [fish, areas] = await Promise.all([
    fetch(base + 'data/fish.json').then(r => r.json()),
    fetch(base + 'data/areas.json').then(r => r.json()),
  ]);
  const byId = new Map(fish.map(f => [f.id, f]));
  // ?all=1 shows all 615 fish (search screens), otherwise the 40-fish sample
  const sample = new URLSearchParams(location.search).get('all')
    ? fish : SAMPLE_IDS.map(id => byId.get(id)).filter(Boolean);
  // area totals are computed from the full data set, like the real app will
  const areaTotals = Object.fromEntries(areas.map(a => [a.id, a.fish_ids.length]));
  return { fish: sample, all: fish, areas, areaTotals, img: f => base + f.image };
}

// Translations taken from scraper/baitfmt.py (CZECH) and scraper/places.py (SPOTS).
// Pelican Lure, Star Lure, Monster Pond, Furniture Factory have no Czech source → stay English.
export const BAIT_CS = {
  'Insects': 'hmyz', 'Fish': 'ryba', 'Vegetal': 'rostlinná', 'Dough': 'těsto', 'Lures': 'nástraha',
  'Meat': 'maso', 'Hook': 'háček', 'Prehistoric Bait': 'prehistorická návnada',
  'Shark Bait': 'žraločí návnada', 'Monster Bait': 'na monstra', 'Barracuda Lure': 'na soltýny',
  'Tuna Lure': 'na tuňáky', 'Marlin Lure': 'na marlíny', 'Monkfish Lure': 'ďasí návnada',
};
export const SPOT_CS = {
  'Pier': 'z mola', 'Boat': 'z člunu', 'Raft': 'z voru', 'Pyramid': 'v pyramidě',
  'Trout Farm': 'farma', 'Enclosure': 'za plotem', 'Salt Water Pond': 'levá slaná nádrž',
  'Fresh Water Pond': 'pravá sladká nádrž', 'Inside': 'uvnitř', 'Outside': 'vně',
};
export const bait = b => BAIT_CS[b] ?? b;
export const spot = s => SPOT_CS[s] ?? s;

const hm = t => t.replace(/^0/, '');
export function fmtTime(time) {
  if (time === null) return { text: 'neznámý', unknown: true };
  if (time === 'always') return { text: 'kdykoliv', always: true };
  return {
    text: time.map(w => `${hm(w.from)}–${hm(w.to)}`).join(', '),
    overnight: time.some(w => w.from > w.to && w.to !== '00:00'),
  };
}
const dm = s => { const [m, d] = s.split('-'); return `${+d}. ${+m}.`; };
export function fmtSeason(season) {
  if (season === null) return { text: 'neznámá', unknown: true };
  if (season === 'always') return { text: 'celý rok', always: true };
  return { text: season.map(w => `${dm(w.from)}–${dm(w.to)}`).join(', ') };
}

export const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// fuzzy match without diacritics: every query word must hit some word of the cs or
// en name as a prefix / substring, or within 1 typo for words of 4+ letters
function near(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function matches(f, q) {
  const words = fold(q).split(/[\s-]+/).filter(Boolean);
  if (!words.length) return true;
  return [f.names.cs, f.names.en].some(n => {
    const hay = fold(n), tokens = hay.split(/[\s-]+/);
    return words.every(w => hay.includes(w) ||
      (w.length >= 4 && tokens.some(tok => near(w, tok) || near(w, tok.slice(0, w.length)))));
  });
}

export const areaName = (areas, id) => areas.find(a => a.id === id)?.name ?? id;
