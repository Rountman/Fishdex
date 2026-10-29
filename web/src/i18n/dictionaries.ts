// Labels for the English tokens used in data/fish.json.
// Czech comes from the scraper sources (scraper/baitfmt.py CZECH, scraper/places.py SPOTS).
// `cs: null` = no Czech source; the UI shows the English label in italics.
// scripts/build-data.ts fails if the data contains a token missing here.

export type Label = { cs: string | null; en: string };

export const BAITS = {
  'Insects': { cs: 'hmyz', en: 'Insects' },
  'Fish': { cs: 'ryba', en: 'Fish' },
  'Vegetal': { cs: 'rostlinná', en: 'Vegetal' },
  'Dough': { cs: 'těsto', en: 'Dough' },
  'Lures': { cs: 'nástraha', en: 'Lures' },
  'Meat': { cs: 'maso', en: 'Meat' },
  'Hook': { cs: 'háček', en: 'Hook' },
  'Prehistoric Bait': { cs: 'prehistorická návnada', en: 'Prehistoric Bait' },
  'Shark Bait': { cs: 'žraločí návnada', en: 'Shark Bait' },
  'Monster Bait': { cs: 'na monstra', en: 'Monster Bait' },
  'Barracuda Lure': { cs: 'na soltýny', en: 'Barracuda Lure' },
  'Tuna Lure': { cs: 'na tuňáky', en: 'Tuna Lure' },
  'Marlin Lure': { cs: 'na marlíny', en: 'Marlin Lure' },
  'Monkfish Lure': { cs: 'ďasí návnada', en: 'Monkfish Lure' },
  'Pelican Lure': { cs: null, en: 'Pelican Lure' },
  'Star Lure': { cs: null, en: 'Star Lure' },
} as const satisfies Record<string, Label>;

export const SPOTS = {
  'Pier': { cs: 'z mola', en: 'pier' },
  'Boat': { cs: 'z člunu', en: 'boat' },
  'Raft': { cs: 'z voru', en: 'raft' },
  'Pyramid': { cs: 'v pyramidě', en: 'pyramid' },
  'Trout Farm': { cs: 'farma', en: 'trout farm' },
  'Enclosure': { cs: 'za plotem', en: 'enclosure' },
  'Salt Water Pond': { cs: 'levá slaná nádrž', en: 'salt water pond' },
  'Fresh Water Pond': { cs: 'pravá sladká nádrž', en: 'fresh water pond' },
  'Inside': { cs: 'uvnitř', en: 'inside' },
  'Outside': { cs: 'vně', en: 'outside' },
  'Monster Pond': { cs: null, en: 'monster pond' },
  'Furniture Factory': { cs: null, en: 'furniture factory' },
} as const satisfies Record<string, Label>;

export type Bait = keyof typeof BAITS;
export type Spot = keyof typeof SPOTS;
