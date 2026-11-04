/**
 * Transforms the scrape output (../data, ../images) into what the web app ships:
 *   src/data/fish.json, src/data/areas.json  – only the fields the UI needs
 *   public/fish/<id>.webp                      – same pixel size, never upscaled
 *   src/data/furniture.json, furnitureCollections.json, public/furniture/[sets/]<id>.webp
 * data/ is never modified. Unknown bait / spot tokens or broken records fail the build.
 *
 * Run: npm run data   (also runs before dev and build)
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BAITS, SPOTS, type Bait, type Spot } from '../src/i18n/dictionaries.ts';
import {
  FURNITURE_RARITIES, type Area, type AreaKind, type Availability, type Fish, type FurnitureCollection, type FurnitureItem,
  type FurnitureRarity, type FurnitureType, type MonthRange, type Schedule, type UncertainField,
} from '../src/data/types.ts';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(WEB, '..');
const OUT_DATA = join(WEB, 'src', 'data');
const OUT_IMG = join(WEB, 'public', 'fish');
const OUT_FURN = join(WEB, 'public', 'furniture');

// --- source shapes (only what we read) -------------------------------------
type SrcWindow = { from: string; to: string };
type SrcFish = {
  id: string;
  names: { cs?: string; en: string };
  areas: string[];
  area_spots: Record<string, string[]>;
  time: SrcWindow[] | 'always' | null;
  season: SrcWindow[] | 'always' | null;
  rarity: number;
  bait: string[];
  max_length_label: string | null;
  length_cm: { min: number; avg: number; max: number } | null;
  extra: {
    fishao_cz?: { fields: Record<string, string | null | undefined> }[];
    fishaofunwiki?: { time?: string | null; season?: string | null } | null;
  };
  has_glowing_variant: boolean | null;
  uncertain: string[];
  image: string;
};
type SrcArea = { id: string; name: string; kind: string; spots: string[]; fish_ids: string[] };
type SrcFurniture = {
  id: string;
  names: { cs: string; en: string };
  set: string | null;
  type: string | null;
  rarity: string | null;
  source: string | null;
  level: number | null;
  availability_raw: string | null;
  season_raw: string | null;
  image: string | null;
};
type SrcSet = { id: string; names: { cs: string; en: string }; kind: 'set' | 'type'; image: string | null };

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const isBait = (b: string): b is Bait => b in BAITS;
const isSpot = (s: string): s is Spot => s in SPOTS;

/**
 * User decisions after auditing all sources. A spot list replaces the source one, [] = no spot.
 * The spots came from the wiki 5-star table, "(Py)" there is wrong against every other source.
 * Rarity: wiki and fishaofunwiki agree, fishao.cz alone differs.
 */
const SPOT_CORRECTIONS: Record<string, Record<string, string[]>> = {
  'candy-basslet': { 'mystic-desert': ['Furniture Factory'] },
  'lavender-mbuna': { 'mystic-desert': [] },
  'red-phantom-tetra': { club: ['Fresh Water Pond'] },
};
const RARITY_CORRECTIONS: Record<string, number> = { 'murray-cod': 4, xenacanthus: 2 };

function applyCorrections(f: SrcFish) {
  f.rarity = RARITY_CORRECTIONS[f.id] ?? f.rarity;
  for (const [area, list] of Object.entries(SPOT_CORRECTIONS[f.id] ?? {})) {
    if (list.length) f.area_spots[area] = list;
    else delete f.area_spots[area];
  }
}

/**
 * User decision: when another source states a different definite value, the UI shows "?".
 * Values are compared by what they cover, so "Sep-Dec, Jan-Mar" equals "Sep-Mar"; a source
 * text with "?" or "+" is not definite and starts no dispute.
 */
type Window = { from: string; to: string };
const CZ_TIME = 'Výskyt / čas', CZ_SEASON = 'Výskyt / období';
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const two = (n: number | string) => String(n).padStart(2, '0');
const dayOfYear = (mmdd: string) => {
  const [m, d] = mmdd.split('-').map(Number);
  return MONTH_DAYS.slice(0, m - 1).reduce((a, b) => a + b, 0) + Math.min(d, MONTH_DAYS[m - 1]) - 1;
};
/** Marks a..b on a ring; a window ending where it starts covers everything. */
function cover(size: number, windows: Window[], at: (s: string) => number) {
  const out = new Array<boolean>(size).fill(false);
  for (const w of windows) {
    let i = at(w.from);
    const end = at(w.to);
    do { out[i] = true; i = (i + 1) % size; } while (i !== end);
  }
  return out;
}
const quarter = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return Math.floor((h * 60 + m) / 15);
};
const timeCover = (v: Exclude<Schedule, null>) => (v === 'always' ? new Array<boolean>(96).fill(true) : cover(96, v, quarter));
/** The season's last day counts too, unlike a time window's end. */
const seasonCover = (v: Exclude<Schedule, null>) =>
  (v === 'always' ? new Array<boolean>(365).fill(true) : cover(365, v.map(w => ({ from: w.from, to: dayAfter(w.to) })), dayOfYear));
const dayAfter = (mmdd: string) => {
  const [m, d] = mmdd.split('-').map(Number);
  return d >= MONTH_DAYS[m - 1] ? `${two(m % 12 + 1)}-01` : `${two(m)}-${two(d + 1)}`;
};
const differingSlots = (a: boolean[], b: boolean[]) => a.filter((v, i) => v !== b[i]).length;

function parseTimeText(text: string): Exclude<Schedule, null> | null {
  if (/[?+]/.test(text)) return null;
  if (/^(always|kdykoliv)$/i.test(text.trim())) return 'always';
  const w = [...text.matchAll(/(\d{1,2}):(\d\d)\s*-\s*(\d{1,2}):(\d\d)/g)].map(m => ({ from: `${two(m[1])}:${m[2]}`, to: `${two(m[3])}:${m[4]}` }));
  return w.length ? w : null;
}
function parseFunwikiSeason(text: string): Exclude<Schedule, null> | null {
  if (/always/i.test(text)) return 'always';
  const out: Window[] = [];
  for (const part of text.split(',')) {
    const m = part.trim().match(/([A-Za-z]+) (\d+)\s*-\s*(?:([A-Za-z]+) )?(\d+)/);
    if (!m) return null;
    const from = MONTHS.indexOf(m[1].toLowerCase()) + 1, to = m[3] ? MONTHS.indexOf(m[3].toLowerCase()) + 1 : from;
    out.push({ from: `${two(from)}-${two(m[2])}`, to: `${two(to)}-${two(m[4])}` });
  }
  return out;
}
function parseCzSeason(text: string): Exclude<Schedule, null> | null {
  if (text.includes('?')) return null;
  if (/^vždy$/i.test(text.trim())) return 'always';
  const w = [...text.matchAll(/(\d{1,2})\.(\d{1,2})\.(?:\d{4})?\s*-\s*(\d{1,2})\.(\d{1,2})\./g)]
    .map(m => ({ from: `${two(m[2])}-${two(m[1])}`, to: `${two(m[4])}-${two(m[3])}` }));
  return w.length ? w : null;
}

function disputed(f: SrcFish, time: Schedule, season: Schedule): UncertainField[] {
  const cz = (key: string) => (f.extra.fishao_cz ?? []).flatMap(p => (p.fields[key] ?? '').split('/')).filter(s => s.trim());
  const out: UncertainField[] = [];
  if (time !== null) {
    const ours = timeCover(time);
    const others = [f.extra.fishaofunwiki?.time ?? '', ...cz(CZ_TIME)].filter(Boolean).map(parseTimeText);
    if (others.some(v => v && differingSlots(timeCover(v), ours) > 0)) out.push('time');
  }
  if (season !== null) {
    const ours = seasonCover(season);
    const others = [
      ...(f.extra.fishaofunwiki?.season ? [parseFunwikiSeason(f.extra.fishaofunwiki.season)] : []),
      ...cz(CZ_SEASON).map(parseCzSeason),
    ];
    // a few days' difference is how sources write month ends, not a dispute
    if (others.some(v => v && differingSlots(seasonCover(v), ours) > 3)) out.push('season');
  }
  return out;
}

/**
 * User decision: these places don't exist in the game. Pinheira Beach has no pyramid; the only
 * source is the giant-moray row of fishaofunwiki, wiki area table and fishao.cz both say pier.
 */
const NOT_REAL_SPOTS: Record<string, string[]> = { 'pinheira-beach': ['Pyramid'] };
const realSpots = (area: string, list: string[]) => list.filter(s => !NOT_REAL_SPOTS[area]?.includes(s));

/** User decision: a spot here is a separate place, every fish with a spot bites only there. */
const SPOT_ALWAYS_SEPARATE = new Set(['mystic-desert']);
/**
 * User decision: separate too, but some spot fish also bite in the open area. Only fishao.cz tells
 * them apart: "Cool Mountain (z voru)" alone = raft only, plus plain "Cool Mountain" = both.
 */
const SPOT_SEPARATE_PER_FISH: Record<string, string> = {
  'cool-mountain': 'Cool Mountain',
  'pinheira-beach': 'Pinheira Beach',
  'thombani-town': 'Thombani Town',
  'seagull-harbor': 'Seagull Harbor',
  'laketown': 'Laketown',
  'palm-island': 'Palm Island',
  'club': 'Klub',
};

function spotAccess(f: SrcFish): Record<string, 'only' | 'also'> | undefined {
  const places = new Set((f.extra.fishao_cz ?? []).flatMap(p => (p.fields['Výskyt / oblast'] ?? '').split('|').map(s => s.trim())));
  const out: Record<string, 'only' | 'also'> = {};
  for (const area of Object.keys(f.area_spots)) {
    if (SPOT_ALWAYS_SEPARATE.has(area)) out[area] = 'only';
    const name = SPOT_SEPARATE_PER_FISH[area];
    if (!name) continue;
    if (![...places].some(p => p.startsWith(name))) fail(`${f.id}: no fishao.cz location for ${name}`);
    out[area] = places.has(name) ? 'also' : 'only';
  }
  return Object.keys(out).length ? out : undefined;
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function schedule(id: string, field: string, v: SrcFish['time'], re: RegExp): Schedule {
  if (v === null || v === 'always') return v;
  if (!Array.isArray(v) || !v.length) { fail(`${id}: ${field} has unexpected value ${JSON.stringify(v)}`); return null; }
  for (const w of v) if (!re.test(w.from) || !re.test(w.to)) fail(`${id}: ${field} window ${w.from}–${w.to} is malformed`);
  return v.map(w => ({ from: w.from, to: w.to }));
}

// --- images ----------------------------------------------------------------
const WHITE = 232;      // min(r,g,b) at or above this counts as background white
const FEATHER = 200;    // light edge pixels next to removed background get partial alpha

/**
 * Some source PNGs (from fishao.cz) have an opaque white background instead of
 * transparency. Clear white that is connected to the image border (flood fill), so
 * white parts inside the fish stay, then soften the light anti-aliasing fringe.
 */
function clearWhiteBackground(px: Buffer, w: number, h: number): number {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const isBg = (i: number) => px[i + 3] > 0 && Math.min(px[i], px[i + 1], px[i + 2]) >= WHITE;
  const cleared = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
  let count = 0;
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h || cleared[y * w + x]) continue;
    const i = at(x, y);
    if (!isBg(i)) continue;
    cleared[y * w + x] = 1;
    px[i + 3] = 0;
    count++;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (cleared[y * w + x]) continue;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && cleared[ny * w + nx]) { edge = true; break; }
    }
    if (!edge) continue;
    const i = at(x, y);
    const light = Math.min(px[i], px[i + 1], px[i + 2]);
    if (light >= FEATHER) px[i + 3] = Math.round(px[i + 3] * (255 - light) / (255 - FEATHER));
  }
  return count;
}

function hasWhiteBackground(px: Buffer, w: number, h: number): boolean {
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(p => p * 4);
  const white = corners.filter(i => px[i + 3] > 200 && Math.min(px[i], px[i + 1], px[i + 2]) >= WHITE);
  return white.length >= 2;
}

async function convertImage(src: string, id: string, outDir = OUT_IMG): Promise<{ w: number; h: number; cleaned: boolean; bytes: number }> {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = hasWhiteBackground(data, info.width, info.height);
  if (cleaned) clearWhiteBackground(data, info.width, info.height);
  const webp = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    // effort 6 is ~30× slower on these small images for no visible gain
    .webp({ quality: 90, alphaQuality: 100, effort: 4 })
    .toBuffer();
  await writeFile(join(outDir, `${id}.webp`), webp);
  return { w: info.width, h: info.height, cleaned, bytes: webp.length };
}

// --- furniture -------------------------------------------------------------
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const TYPES: FurnitureType[] = ['wall', 'floor', 'furniture', 'plant', 'painting'];
const isRarity = (r: string): r is FurnitureRarity => (FURNITURE_RARITIES as readonly string[]).includes(r);

/** "Always" | "December" | "March-June"; anything else is unknown (e.g. the beta statue repeats its availability). */
function monthRange(raw: string | null): MonthRange | 'always' | null {
  if (!raw) return null;
  if (raw === 'Always') return 'always';
  const [a, b = a] = raw.toLowerCase().split('-');
  const from = MONTHS.indexOf(a) + 1, to = MONTHS.indexOf(b) + 1;
  return from && to ? { from, to } : null;
}

function availability(f: SrcFurniture): Availability | null {
  if (f.source === 'factory') return { kind: 'factory' };
  if (f.source === 'mission') return { kind: 'mission' };
  if (f.level !== null) return { kind: 'level', level: f.level };
  if (f.availability_raw === 'Free in inventory') return { kind: 'free' };
  if (/closed beta/i.test(f.availability_raw ?? '')) return { kind: 'beta' };
  return null;
}

async function buildFurniture(): Promise<{ items: FurnitureItem[]; collections: FurnitureCollection[]; bytes: number }> {
  const src: SrcFurniture[] = JSON.parse(await readFile(join(REPO, 'data', 'furniture.json'), 'utf8'));
  const sets: SrcSet[] = JSON.parse(await readFile(join(REPO, 'data', 'furniture_sets.json'), 'utf8'));
  await rm(OUT_FURN, { recursive: true, force: true });
  await mkdir(join(OUT_FURN, 'sets'), { recursive: true });

  let bytes = 0;
  const setIds = new Set(sets.filter(s => s.kind === 'set').map(s => s.id));
  const typeGroups = new Set(sets.filter(s => s.kind === 'type').map(s => s.id));
  const seen = new Set<string>();
  const items: FurnitureItem[] = [];
  const imgs = new Map<string, { w: number; h: number }>();
  for (let i = 0; i < src.length; i += 16) {
    await Promise.all(src.slice(i, i + 16).map(async f => {
      if (!f.image) return fail(`furniture ${f.id}: no image`);
      const img = await convertImage(join(REPO, f.image), f.id, OUT_FURN);
      bytes += img.bytes;
      imgs.set(f.id, { w: img.w, h: img.h });
    }));
  }
  for (const f of src) {
    if (seen.has(f.id)) fail(`furniture ${f.id}: duplicate id`);
    seen.add(f.id);
    if (f.set && !setIds.has(f.set)) fail(`furniture ${f.id}: unknown set ${f.set}`);
    if (f.type && !TYPES.includes(f.type as FurnitureType)) fail(`furniture ${f.id}: type ${f.type}`);
    if (f.rarity && !isRarity(f.rarity)) fail(`furniture ${f.id}: rarity ${f.rarity}`);
    const type = TYPES.includes(f.type as FurnitureType) ? f.type as FurnitureType : null;
    // outside sets: funwiki groups plants and paintings, the rest is "other"
    const group = `${type}s`;
    const collection = f.set ?? (typeGroups.has(group) ? group : 'other');
    const avail = availability(f);
    if (!avail) fail(`furniture ${f.id}: availability "${f.availability_raw}" not understood`);
    const season = monthRange(f.season_raw);
    if (season === null && f.season_raw && !/closed beta/i.test(f.season_raw)) fail(`furniture ${f.id}: season "${f.season_raw}" not understood`);
    items.push({
      id: f.id, names: { cs: f.names.cs, en: f.names.en }, collection, type,
      rarity: f.rarity && isRarity(f.rarity) ? f.rarity : null, availability: avail, season,
      img: imgs.get(f.id) ?? { w: 128, h: 128 },
    });
  }

  const collections: FurnitureCollection[] = [];
  for (const s of sets) {
    if (s.image) await convertImage(join(REPO, s.image), s.id, join(OUT_FURN, 'sets'));
    collections.push({ id: s.id, kind: s.kind, names: s.names, badge: !!s.image, count: items.filter(i => i.collection === s.id).length });
  }
  collections.push({ id: 'other', kind: 'other', names: { cs: 'Ostatní', en: 'Other' }, badge: false, count: items.filter(i => i.collection === 'other').length });
  for (const c of collections) if (!c.count) fail(`furniture collection ${c.id} is empty`);
  return { items, collections, bytes };
}

// --- main ------------------------------------------------------------------
async function main() {
  const srcFish: SrcFish[] = JSON.parse(await readFile(join(REPO, 'data', 'fish.json'), 'utf8'));
  const srcAreas: SrcArea[] = JSON.parse(await readFile(join(REPO, 'data', 'areas.json'), 'utf8'));

  await rm(OUT_IMG, { recursive: true, force: true });
  await mkdir(OUT_IMG, { recursive: true });
  await mkdir(OUT_DATA, { recursive: true });

  const areaIds = new Set(srcAreas.map(a => a.id));
  const seen = new Set<string>();
  const cleanedIds: string[] = [];
  let totalBytes = 0, largest = 0;

  // convert images in parallel batches, keep data order
  const images = new Map<string, Awaited<ReturnType<typeof convertImage>>>();
  for (let i = 0; i < srcFish.length; i += 16) {
    await Promise.all(srcFish.slice(i, i + 16).map(async f => images.set(f.id, await convertImage(join(REPO, f.image), f.id))));
  }

  const fish: Fish[] = [];
  for (const f of srcFish) {
    applyCorrections(f);
    if (seen.has(f.id)) fail(`${f.id}: duplicate id`);
    seen.add(f.id);
    if (!f.names.cs) fail(`${f.id}: missing Czech name`);
    if (![1, 2, 3, 4, 5].includes(f.rarity)) fail(`${f.id}: rarity ${f.rarity}`);
    for (const a of f.areas) if (!areaIds.has(a)) fail(`${f.id}: unknown area ${a}`);
    for (const b of f.bait) if (!isBait(b)) fail(`${f.id}: bait "${b}" missing in src/i18n/dictionaries.ts`);
    const spots: Record<string, Spot[]> = {};
    for (const [area, list] of Object.entries(f.area_spots)) {
      for (const s of list) if (!isSpot(s)) fail(`${f.id}: spot "${s}" missing in src/i18n/dictionaries.ts`);
      spots[area] = realSpots(area, list).filter(isSpot);
      if (!spots[area].length) fail(`${f.id}: no real spot left in ${area}`);
    }

    const time = schedule(f.id, 'time', f.time, HHMM);
    const season = schedule(f.id, 'season', f.season, MMDD);
    const img = images.get(f.id)!;
    if (img.cleaned) cleanedIds.push(f.id);
    totalBytes += img.bytes;
    largest = Math.max(largest, img.bytes);

    fish.push({
      id: f.id,
      names: { cs: f.names.cs ?? f.names.en, en: f.names.en },
      areas: f.areas,
      spots,
      spotAccess: spotAccess(f),
      time,
      season,
      rarity: f.rarity as Fish['rarity'],
      bait: f.bait.filter(isBait),
      size: f.length_cm,
      record: f.max_length_label,
      uncertain: [...new Set([
        ...f.uncertain.filter((u): u is UncertainField => u === 'time' || u === 'season' || u === 'bait'),
        ...disputed(f, time, season),
      ])],
      glowing: true,
      img: { w: img.w, h: img.h },
    });
  }

  const kinds: AreaKind[] = ['area', 'tournament', 'backyard'];
  const areas: Area[] = srcAreas.map(a => {
    if (!kinds.includes(a.kind as AreaKind)) fail(`area ${a.id}: kind ${a.kind}`);
    for (const s of a.spots) if (!isSpot(s)) fail(`area ${a.id}: spot "${s}" missing in dictionaries`);
    const count = fish.filter(f => f.areas.includes(a.id)).length;
    if (count !== a.fish_ids.length) fail(`area ${a.id}: ${count} fish reference it, fish_ids has ${a.fish_ids.length}`);
    const open = fish.some(f => f.areas.includes(a.id) && f.spotAccess?.[a.id] !== 'only');
    return { id: a.id, name: a.name, kind: a.kind as AreaKind, spots: realSpots(a.id, a.spots).filter(isSpot), count, open };
  });

  const furniture = await buildFurniture();

  if (errors.length) {
    console.error(`build-data: ${errors.length} problem(s)\n  ` + errors.join('\n  '));
    process.exit(1);
  }

  await writeFile(join(OUT_DATA, 'fish.json'), JSON.stringify(fish));
  await writeFile(join(OUT_DATA, 'areas.json'), JSON.stringify(areas));
  await writeFile(join(OUT_DATA, 'furniture.json'), JSON.stringify(furniture.items));
  await writeFile(join(OUT_DATA, 'furnitureCollections.json'), JSON.stringify(furniture.collections));

  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  console.log(`build-data: ${fish.length} fish, ${areas.length} areas`);
  console.log(`  images: ${kb(totalBytes)} total, largest ${kb(largest)}`);
  console.log(`build-data: ${furniture.items.length} furniture items in ${furniture.collections.length} collections, images ${kb(furniture.bytes)}`);
  console.log(`  white background removed (${cleanedIds.length}): ${cleanedIds.join(', ')}`);
}

await main();
