/**
 * Transforms the scrape output (../data, ../images) into what the web app ships:
 *   src/data/fish.json, src/data/areas.json  – only the fields the UI needs
 *   public/fish/<id>.webp                      – same pixel size, never upscaled
 *   src/data/furniture.json, furnitureCollections.json, public/furniture/[sets/]<id>.webp
 * data/ is never modified. Unknown locations, places, baits, fruits or broken records fail the build.
 *
 * Run: npm run data   (also runs before dev and build)
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FRUITS, SPOTS, type Bait, type Fruit, type Spot } from '../src/i18n/dictionaries.ts';
import {
  FURNITURE_RARITIES, type Area, type AreaKind, type Availability, type Fish, type FurnitureCollection, type FurnitureItem,
  type FurnitureRarity, type FurnitureType, type MonthRange, type Schedule, type Unlock, type Zone, ZONES, isZonedArea,
} from '../src/data/types.ts';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(WEB, '..');
const OUT_DATA = join(WEB, 'src', 'data');
const OUT_IMG = join(WEB, 'public', 'fish');
const OUT_FURN = join(WEB, 'public', 'furniture');
const OUT_MAPS = join(WEB, 'public', 'maps');

// --- source shapes (only what we read) -------------------------------------
/** The archive scrape (data/fish.json) gives the id list, names, world record and image. */
type SrcFish = {
  id: string;
  names: { cs?: string; en: string };
  max_length_label: string | null;
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
  price: number | null;
  image: string | null;
  extra?: { fishaowiki?: { cells?: Record<string, string> }; fishao_cz?: { price_raw?: string | null } };
};
type SrcSet = { id: string; names: { cs: string; en: string }; kind: 'set' | 'type'; image: string | null };

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

const isFruit = (s: string): s is Fruit => s in FRUITS;

// --- official wiki (data/fishao_net.json) -----------------------------------
// User decision: fishao.net is the main source for where, rarity, bait, time, season, length,
// breeding and unlocking. Names (cs) and world records stay from the archive scrape; where the
// archive only has the English name, the Czech one comes from fishao.net, then fishao-tracker.cz.
type NetFish = {
  id: number; fishdex_id: string | null; name: string; name_cs?: string; rating: number; factor: number;
  min: number; avg: number; max: number; locs: number[]; baits: string[]; places: string[];
  times: string[]; dates: string[]; collections: string[]; fruitCombos: string[];
  clubPoints: number; clubPrice: number; breed: { cost: number; hours: number; rate: number } | null;
};
type NetData = { fish: NetFish[]; palm_island_zones: string[] };
/** fishao-tracker.cz (data/fishao_tracker.json): Moray tournament zones + Czech names, by fishao.net id. */
type TrackerData = {
  moray_tournament: { id: number; fishdex_id: string | null; zones: string[] }[];
  names_cs: Record<string, string>;
  /** Fish Market sell price estimate in FB (the tracker's own calculation, not a reported price). */
  estimated_prices: { id: number; min: number; max: number }[];
};
const MORAY = 'moray-tournament';

/** Official location id -> our area id. */
const NET_AREA: Record<number, string> = {
  1: 'laketown', 2: 'rio-tropical', 3: 'pinheira-beach', 4: 'cool-mountain', 5: 'mystic-desert', 6: 'sibiri-city',
  7: 'aquayama', 8: 'seagull-harbor', 9: 'thombani-town', 10: 'marshville', 11: 'palm-island', 12: 'lucky-raft',
  110: 'little-rio', 111: 'pirate-cave', 112: 'club', 201: 'boat-on-sea-tournament', 202: 'lake-run-tournament',
  203: 'race-magic-15-tournament', 204: 'moray-tournament', 300: 'backyard',
};
/** "Hidden spots" the wiki lists as own locations; we keep them as a spot of their area. */
const NET_HIDDEN: Record<number, [string, Spot]> = {
  101: ['laketown', 'Trout Farm'], 104: ['mystic-desert', 'Pyramid'], 113: ['mystic-desert', 'Furniture Factory'],
};
/** Places inside an area: a fish with a place bites only there. */
const NET_PLACE: Record<string, [string, Spot]> = {
  EFPT_PANHEIRA_BEACH_JETTY: ['pinheira-beach', 'Pier'],
  EFPT_COOL_MOUNTAIN_RAFT: ['cool-mountain', 'Raft'],
  EFPT_SEAGULL_HARBOR_BOAT: ['seagull-harbor', 'Boat'],
  EFPT_THOMBANI_TOWN_AFRICAN_LAKE: ['thombani-town', 'Enclosure'],
  EFPT_CLUB_AREA_SALT: ['club', 'Salt Water Pond'],
  EFPT_CLUB_AREA_FRESH: ['club', 'Fresh Water Pond'],
};
const LOST_VALLEY = 108;
const PALM_ZONE = /^EFPT_PALM_ISLAND_ZONE_([A-H])$/;
const NET_BAIT: Record<string, Bait> = {
  fish: 'Fish', insects: 'Insects', vegetal: 'Vegetal', dough: 'Dough', lures: 'Lures', meat: 'Meat', hook: 'Hook',
  prehistoric: 'Prehistoric Bait', shark: 'Shark Bait', monster: 'Monster Bait', barracuda: 'Barracuda Lure',
  tuna: 'Tuna Lure', marlin: 'Marlin Lure', monkfish: 'Monkfish Lure', pelican: 'Pelican Lure', star: 'Star Lure',
};

type Where = { areas: string[]; spots: Record<string, Spot[]>; zones?: Zone[] };

/** "A".."H" from the source, none listed = the fish bites in every zone. */
const zoneList = (z: string[]): Zone[] => (z.length ? ZONES.filter(x => z.includes(x)) : [...ZONES]);

function netWhere(n: NetFish, morayZones: Map<number, string[]>): Where {
  const areas: string[] = [];
  const spots: Record<string, Spot[]> = {};
  const add = (area: string, spot?: Spot) => {
    if (!areas.includes(area)) areas.push(area);
    if (spot && !spots[area]?.includes(spot)) (spots[area] ??= []).push(spot);
  };
  let zones: Zone[] | undefined;
  for (const p of n.places) {
    if (!NET_PLACE[p] && !PALM_ZONE.test(p) && !p.startsWith('EFPT_LOST_VALLEY_POND_')) fail(`${n.name}: unknown place ${p}`);
  }
  for (const loc of n.locs) {
    if (NET_HIDDEN[loc]) { add(...NET_HIDDEN[loc]); continue; }
    if (loc === LOST_VALLEY) {
      const ponds = n.places.filter(p => p.startsWith('EFPT_LOST_VALLEY_POND_'));
      if (!ponds.length) fail(`${n.name}: Lost Valley without a pond`);
      for (const p of ponds) add(`lost-valley-${p.at(-1)}`);
      continue;
    }
    const area = NET_AREA[loc];
    if (!area) { fail(`${n.name}: unknown location ${loc}`); continue; }
    if (isZonedArea(area)) {
      if (zones) fail(`${n.name}: in two zoned areas, Fish.zones holds only one`);
      let z: string[];
      if (area === MORAY) {
        // fishao.net has no Moray tournament zones, fishao-tracker.cz does
        const t = morayZones.get(n.id);
        if (!t) fail(`${n.name}: Moray tournament fish missing in data/fishao_tracker.json`);
        z = t ?? [];
      } else {
        z = n.places.map(p => PALM_ZONE.exec(p)?.[1]).filter((x): x is string => !!x);
      }
      zones = zoneList(z);
      for (const x of zones) add(area, `Zone ${x}`);
      continue;
    }
    const own = n.places.filter(p => NET_PLACE[p]?.[0] === area);
    if (own.length) for (const p of own) add(area, NET_PLACE[p][1]);
    else add(area);
  }
  for (const list of Object.values(spots)) list.sort((a, b) => SPOT_ORDER.indexOf(a) - SPOT_ORDER.indexOf(b));
  return { areas, spots, zones };
}
const SPOT_ORDER = Object.keys(SPOTS) as Spot[];

/** "05:00-11:00" / "03.01-06.30" -> windows; none listed = always. */
const netTime = (times: string[]): Schedule =>
  times.length ? times.map(s => { const [from, to] = s.split('-'); return { from, to }; }) : 'always';

const nextDay = (mmdd: string) => {
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const [m, d] = mmdd.split('-').map(Number);
  const pad = (x: number) => String(x).padStart(2, '0');
  return d >= DAYS[m - 1] ? `${pad(m % 12 + 1)}-01` : `${pad(m)}-${pad(d + 1)}`;
};
/** Seasons, with windows that touch merged (the wiki writes Dec 1–31 + Jan 1–31 for Dec–Jan). */
function netSeason(dates: string[]): Schedule {
  if (!dates.length) return 'always';
  const w = dates.map(s => { const [a, b] = s.split('-'); return { from: a.replace('.', '-'), to: b.replace('.', '-') }; });
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i < w.length && !again; i++) {
      const j = w.findIndex((o, k) => k !== i && nextDay(w[i].to) === o.from);
      if (j >= 0) { w[i] = { from: w[i].from, to: w[j].to }; w.splice(j, 1); again = true; }
    }
  }
  if (w.some(x => nextDay(x.to) === x.from)) return 'always';
  return w.sort((a, b) => a.from.localeCompare(b.from));
}

/** "Balloon set" -> furniture set id, "Gyrodus fossils" -> fossil collection. */
function netUnlock(n: NetFish, setIds: Map<string, string>): Unlock[] {
  const out: Unlock[] = [];
  for (const c of n.collections) {
    const fossils = /^(.+) fossils$/.exec(c);
    if (fossils) { out.push({ kind: 'fossils', name: fossils[1] }); continue; }
    const set = setIds.get(c.toLowerCase());
    if (set) out.push({ kind: 'set', set });
    else fail(`${n.name}: collection "${c}" is neither fossils nor a furniture set`);
  }
  for (const combo of n.fruitCombos) {
    const fruits = combo.split(', ');
    for (const f of fruits) if (!isFruit(f)) fail(`${n.name}: fruit "${f}" missing in src/i18n/dictionaries.ts`);
    out.push({ kind: 'fruits', fruits: fruits.filter(isFruit) });
  }
  if (n.clubPoints) out.push({ kind: 'clubPoints', points: n.clubPoints });
  if (n.clubPrice) out.push({ kind: 'clubEarly', coins: n.clubPrice });
  return out;
}

/** The zone grid drives the map: 13x13 cells, every zone present, nothing unknown. */
function checkZones(grid: string[]) {
  if (grid.length !== 13 || grid.some(r => r.length !== 13)) fail('palm island zone grid is not 13x13');
  const seen = new Set(grid.join('').replace(/\./g, ''));
  for (const z of ZONES) if (!seen.has(z)) fail(`palm island zone ${z} missing in the grid`);
  for (const z of seen) if (!ZONES.includes(z as Zone)) fail(`palm island zone ${z} unknown`);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function schedule(id: string, field: string, v: Schedule, re: RegExp): Schedule {
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

/** Prices the other sources give where they differ from funwiki (which wins, see furniture-report.md). */
function priceAlt(f: SrcFurniture): number[] {
  const raw = [f.extra?.fishaowiki?.cells?.['Price / Home points'], f.extra?.fishao_cz?.price_raw];
  const alt = raw.filter((r): r is string => !!r && /^\d+$/.test(r)).map(Number).filter(n => n !== f.price);
  return [...new Set(alt)];
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
      price: f.price, priceAlt: f.price === null ? [] : priceAlt(f),
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

  const net: NetData = JSON.parse(await readFile(join(REPO, 'data', 'fishao_net.json'), 'utf8'));
  checkZones(net.palm_island_zones);
  const netById = new Map(net.fish.filter(n => n.fishdex_id).map(n => [n.fishdex_id!, n]));
  const tracker: TrackerData = JSON.parse(await readFile(join(REPO, 'data', 'fishao_tracker.json'), 'utf8'));
  const morayZones = new Map(tracker.moray_tournament.map(m => [m.id, m.zones]));
  const prices = new Map(tracker.estimated_prices.map(p => [p.id, { min: p.min, max: p.max }]));
  for (const z of tracker.moray_tournament.flatMap(m => m.zones)) if (!ZONES.includes(z as Zone)) fail(`fishao-tracker zone ${z} unknown`);
  /** Archive name unless it is only the English one copied over; then fishao.net, then the tracker. */
  const nameCs = (f: SrcFish, n: NetFish) => {
    const en = f.names.en;
    for (const cs of [f.names.cs, n.name_cs, tracker.names_cs[n.id]]) if (cs && cs !== en && cs !== n.name) return cs;
    return f.names.cs ?? en;
  };
  const filledCs: string[] = [];
  const sets: SrcSet[] = JSON.parse(await readFile(join(REPO, 'data', 'furniture_sets.json'), 'utf8'));
  const setIds = new Map(sets.filter(s => s.kind === 'set').map(s => [s.names.en.toLowerCase(), s.id]));

  const fish: Fish[] = [];
  for (const f of srcFish) {
    if (seen.has(f.id)) fail(`${f.id}: duplicate id`);
    seen.add(f.id);
    if (!f.names.cs) fail(`${f.id}: missing Czech name`);
    const n = netById.get(f.id);
    if (!n) { fail(`${f.id}: not on fishao.net`); continue; }
    if (![1, 2, 3, 4, 5].includes(n.rating)) fail(`${f.id}: rarity ${n.rating}`);
    for (const b of n.baits) if (!NET_BAIT[b]) fail(`${f.id}: bait category "${b}" not mapped`);
    const where = netWhere(n, morayZones);
    const cs = nameCs(f, n);
    if (cs !== f.names.cs) filledCs.push(`${f.names.en} → ${cs}`);
    for (const a of where.areas) if (!areaIds.has(a)) fail(`${f.id}: unknown area ${a}`);
    if (!where.areas.length) fail(`${f.id}: no location`);

    const time = schedule(f.id, 'time', netTime(n.times), HHMM);
    const season = schedule(f.id, 'season', netSeason(n.dates), MMDD);
    const img = images.get(f.id)!;
    if (img.cleaned) cleanedIds.push(f.id);
    totalBytes += img.bytes;
    largest = Math.max(largest, img.bytes);
    const unlock = netUnlock(n, setIds);
    const rarer = n.factor < 1 ? Math.round(1 / n.factor) : 1;

    fish.push({
      id: f.id,
      names: { cs, en: f.names.en },
      areas: where.areas,
      spots: where.spots,
      ...(where.zones && { zones: where.zones }),
      time,
      season,
      rarity: n.rating as Fish['rarity'],
      ...(rarer > 1 && { rarer }),
      bait: [...new Set(n.baits.map(b => NET_BAIT[b]).filter(Boolean))],
      size: { min: n.min, avg: n.avg, max: n.max },
      record: f.max_length_label,
      ...(prices.has(n.id) && { price: prices.get(n.id)! }),
      ...(n.breed && { breed: { cost: n.breed.cost, hours: n.breed.hours, chance: n.breed.rate } }),
      ...(unlock.length && { unlock }),
      glowing: true,
      img: { w: img.w, h: img.h },
    });
  }
  for (const n of net.fish) if (!n.fishdex_id || !seen.has(n.fishdex_id)) fail(`fishao.net ${n.name}: no fish in data/fish.json`);
  for (const x of fish) if (x.breed && !x.areas.includes('backyard')) fail(`${x.id}: breeding outside the backyard`);

  const kinds: AreaKind[] = ['area', 'tournament', 'backyard'];
  const areas: Area[] = srcAreas.map(a => {
    if (!kinds.includes(a.kind as AreaKind)) fail(`area ${a.id}: kind ${a.kind}`);
    const inIt = fish.filter(f => f.areas.includes(a.id));
    if (!inIt.length) fail(`area ${a.id}: no fish`);
    const spots = SPOT_ORDER.filter(s => inIt.some(f => f.spots[a.id]?.includes(s)));
    // a spot is its own place: fish with a spot in this area don't bite in the open area
    const open = inIt.some(f => !f.spots[a.id]?.length);
    return { id: a.id, name: a.name, kind: a.kind as AreaKind, spots, count: inIt.length, open };
  });

  const zoneCount = (area: string) => {
    const inIt = fish.filter(f => f.zones && f.areas.includes(area));
    return ZONES.map(z => `${z} ${inIt.filter(f => f.zones!.includes(z)).length}`).join(', ');
  };

  const furniture = await buildFurniture();

  if (errors.length) {
    console.error(`build-data: ${errors.length} problem(s)\n  ` + errors.join('\n  '));
    process.exit(1);
  }

  await writeFile(join(OUT_DATA, 'fish.json'), JSON.stringify(fish));
  await writeFile(join(OUT_DATA, 'areas.json'), JSON.stringify(areas));
  await writeFile(join(OUT_DATA, 'palmZones.json'), JSON.stringify(net.palm_island_zones));
  // the Chovatelé API only accepts backyard fish; committed so the worker deploys on its own
  // (CI checks it is up to date)
  const backyard = fish.filter(f => f.areas.includes('backyard')).map(f => f.id).sort();
  await writeFile(join(REPO, 'worker', 'src', 'backyard.json'), JSON.stringify(backyard, null, 1) + '\n');
  // official Palm Island map (1000x1000 webp, ~90 kB), the zone grid is drawn over it
  await mkdir(OUT_MAPS, { recursive: true });
  await copyFile(join(REPO, 'images', 'maps', 'palm-island.webp'), join(OUT_MAPS, 'palm-island.webp'));
  await writeFile(join(OUT_DATA, 'furniture.json'), JSON.stringify(furniture.items));
  await writeFile(join(OUT_DATA, 'furnitureCollections.json'), JSON.stringify(furniture.collections));

  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  console.log(`build-data: ${fish.length} fish, ${areas.length} areas`);
  console.log(`  images: ${kb(totalBytes)} total, largest ${kb(largest)}`);
  console.log(`build-data: ${furniture.items.length} furniture items in ${furniture.collections.length} collections, images ${kb(furniture.bytes)}`);
  console.log(`  palm island zones: ${zoneCount('palm-island')}`);
  console.log(`  moray tournament zones: ${zoneCount(MORAY)}`);
  console.log(`  Czech names filled in (${filledCs.length}): ${filledCs.join(', ')}`);
  console.log(`  white background removed (${cleanedIds.length}): ${cleanedIds.join(', ')}`);
}

await main();
