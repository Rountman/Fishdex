/**
 * Transforms the scrape output (../data, ../images) into what the web app ships:
 *   src/data/fish.json, src/data/areas.json  – only the fields the UI needs
 *   public/fish/<id>.webp                      – same pixel size, never upscaled
 * data/ is never modified. Unknown bait / spot tokens or broken records fail the build.
 *
 * Run: npm run data   (also runs before dev and build)
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BAITS, SPOTS, type Bait, type Spot } from '../src/i18n/dictionaries.ts';
import type { Area, AreaKind, Fish, Schedule, UncertainField } from '../src/data/types.ts';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(WEB, '..');
const OUT_DATA = join(WEB, 'src', 'data');
const OUT_IMG = join(WEB, 'public', 'fish');

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

async function convertImage(src: string, id: string): Promise<{ w: number; h: number; cleaned: boolean; bytes: number }> {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = hasWhiteBackground(data, info.width, info.height);
  if (cleaned) clearWhiteBackground(data, info.width, info.height);
  const webp = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    // effort 6 is ~30× slower on these small images for no visible gain
    .webp({ quality: 90, alphaQuality: 100, effort: 4 })
    .toBuffer();
  await writeFile(join(OUT_IMG, `${id}.webp`), webp);
  return { w: info.width, h: info.height, cleaned, bytes: webp.length };
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

  if (errors.length) {
    console.error(`build-data: ${errors.length} problem(s)\n  ` + errors.join('\n  '));
    process.exit(1);
  }

  await writeFile(join(OUT_DATA, 'fish.json'), JSON.stringify(fish));
  await writeFile(join(OUT_DATA, 'areas.json'), JSON.stringify(areas));

  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  console.log(`build-data: ${fish.length} fish, ${areas.length} areas`);
  console.log(`  images: ${kb(totalBytes)} total, largest ${kb(largest)}`);
  console.log(`  white background removed (${cleanedIds.length}): ${cleanedIds.join(', ')}`);
}

await main();
