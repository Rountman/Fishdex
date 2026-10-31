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
    if (seen.has(f.id)) fail(`${f.id}: duplicate id`);
    seen.add(f.id);
    if (!f.names.cs) fail(`${f.id}: missing Czech name`);
    if (![1, 2, 3, 4, 5].includes(f.rarity)) fail(`${f.id}: rarity ${f.rarity}`);
    for (const a of f.areas) if (!areaIds.has(a)) fail(`${f.id}: unknown area ${a}`);
    for (const b of f.bait) if (!isBait(b)) fail(`${f.id}: bait "${b}" missing in src/i18n/dictionaries.ts`);
    const spots: Record<string, Spot[]> = {};
    for (const [area, list] of Object.entries(f.area_spots)) {
      for (const s of list) if (!isSpot(s)) fail(`${f.id}: spot "${s}" missing in src/i18n/dictionaries.ts`);
      spots[area] = list.filter(isSpot);
    }

    const img = images.get(f.id)!;
    if (img.cleaned) cleanedIds.push(f.id);
    totalBytes += img.bytes;
    largest = Math.max(largest, img.bytes);

    fish.push({
      id: f.id,
      names: { cs: f.names.cs ?? f.names.en, en: f.names.en },
      areas: f.areas,
      spots,
      time: schedule(f.id, 'time', f.time, HHMM),
      season: schedule(f.id, 'season', f.season, MMDD),
      rarity: f.rarity as Fish['rarity'],
      bait: f.bait.filter(isBait),
      size: f.length_cm,
      record: f.max_length_label,
      uncertain: f.uncertain.filter((u): u is UncertainField => u === 'time' || u === 'season' || u === 'bait'),
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
    return { id: a.id, name: a.name, kind: a.kind as AreaKind, spots: a.spots.filter(isSpot), count };
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
