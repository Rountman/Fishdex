// Labels for the English tokens used in data/fish.json.
// Czech comes from the scraper sources (scraper/baitfmt.py CZECH, scraper/places.py SPOTS).
// `cs: null` = no Czech source; the UI shows the English label in italics.
// scripts/build-data.ts fails if the data contains a token missing here.

export type Label = { cs: string | null; en: string };

export const BAITS = {
  'Insects': { cs: 'Hmyz', en: 'Insects' },
  'Fish': { cs: 'Ryba', en: 'Fish' },
  'Vegetal': { cs: 'Rostlinná', en: 'Vegetal' },
  'Dough': { cs: 'Těsto', en: 'Dough' },
  'Lures': { cs: 'Nástraha', en: 'Lures' },
  'Meat': { cs: 'Maso', en: 'Meat' },
  'Hook': { cs: 'Háček', en: 'Hook' },
  'Prehistoric Bait': { cs: 'Prehistorická návnada', en: 'Prehistoric Bait' },
  'Shark Bait': { cs: 'Žraločí návnada', en: 'Shark Bait' },
  'Monster Bait': { cs: 'Na monstra', en: 'Monster Bait' },
  'Barracuda Lure': { cs: 'Na soltýny', en: 'Barracuda Lure' },
  'Tuna Lure': { cs: 'Na tuňáky', en: 'Tuna Lure' },
  'Marlin Lure': { cs: 'Na marlíny', en: 'Marlin Lure' },
  'Monkfish Lure': { cs: 'Ďasí návnada', en: 'Monkfish Lure' },
  'Pelican Lure': { cs: null, en: 'Pelican Lure' },
  'Star Lure': { cs: null, en: 'Star Lure' },
} as const satisfies Record<string, Label>;

export const SPOTS = {
  'Pier': { cs: 'Z mola', en: 'Pier' },
  'Boat': { cs: 'Z člunu', en: 'Boat' },
  'Raft': { cs: 'Z voru', en: 'Raft' },
  'Pyramid': { cs: 'V pyramidě', en: 'Pyramid' },
  'Trout Farm': { cs: 'Farma', en: 'Trout farm' },
  'Enclosure': { cs: 'Za plotem', en: 'Enclosure' },
  'Salt Water Pond': { cs: 'Levá slaná nádrž', en: 'Salt water pond' },
  'Fresh Water Pond': { cs: 'Pravá sladká nádrž', en: 'Fresh water pond' },
  'Inside': { cs: 'Uvnitř', en: 'Inside' },
  'Outside': { cs: 'Vně', en: 'Outside' },
  'Monster Pond': { cs: null, en: 'Monster pond' },
  'Furniture Factory': { cs: 'Továrna na nábytek', en: 'Furniture factory' },
} as const satisfies Record<string, Label>;

export type Bait = keyof typeof BAITS;
export type Spot = keyof typeof SPOTS;
