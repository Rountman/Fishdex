// fishao-tracker.cz -> data/fishao_tracker.json + data/fishao-tracker-report.md.
//
// Fan tracker (Czech). Used for one thing fishao.net does not have: the zones of the Moray
// tournament, which is fished on the Palm Island map with the same zones A–H
// (EFPT_PALM_ISLAND_ZONE_*, labels "Vnější oblast", "Pod lodí", …). Its Czech fish names are kept
// too, as the last fallback after the archive and fishao.net.
//
// The app bundle holds the fish database (`FISHAO_DATA={allFishes:[…]}`) and the names
// (`{14:{cs:…,en:…,pl:…},…}`) as object literals; both are read as TEXT, never executed.
//
// Polite: 2 requests per run (page + bundle), cached in scraper/cache/fishao_tracker/ (gitignored).
// Run: node scraper/fishao_tracker.mjs   [--refresh  = refetch the page, the hashed bundle stays cached]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLiteral } from './literal.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const CACHE = join(HERE, 'cache', 'fishao_tracker');
const BASE = 'https://fishao-tracker.cz/';
const UA = 'FishdexScraper/1.0 (fan project; polite, cached, 1 req/s)';
const REFRESH = process.argv.includes('--refresh');

const MORAY = 'location_204';
const PALM = 'location_11';
const ZONE = /^EFPT_PALM_ISLAND_ZONE_([A-H])$/;

let last = 0;
async function get(path, { immutable = false } = {}) {
  const file = join(CACHE, createHash('sha1').update(path).digest('hex').slice(0, 16) + '.txt');
  if (existsSync(file) && (immutable || !REFRESH)) return readFile(file, 'utf8');
  const wait = last + 1000 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(BASE + path, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = await res.text();
  await writeFile(file, body);
  return body;
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const page = await get('');
  const bundle = /<script[^>]+src="(dist\/app\.[0-9a-f]+\.min\.js)"/.exec(page)?.[1];
  if (!bundle) throw new Error('app bundle not found, the tracker layout changed');
  const src = await get(bundle, { immutable: true });

  const dataAt = src.indexOf('FISHAO_DATA={');
  if (dataAt < 0) throw new Error('FISHAO_DATA literal not found');
  const data = parseLiteral(src, dataAt + 'FISHAO_DATA='.length);
  const namesAt = /var \w+=(\{\d+:\{cs:)/.exec(src);
  if (!namesAt) throw new Error('fish names literal not found');
  const names = parseLiteral(src, namesAt.index + namesAt[0].length - namesAt[1].length);
  // the zone labels, to show in the report that A–H are the same zones
  const labels = {};
  for (const z of 'ABCDEFGH') {
    const m = new RegExp(`EFPT_PALM_ISLAND_ZONE_${z}:\\{cs:"([^"]+)"`).exec(src);
    if (!m) throw new Error(`label of zone ${z} not found`);
    labels[z] = m[1];
  }

  // match on fishao.net ids (the tracker uses the same ones)
  const net = JSON.parse(await readFile(join(REPO, 'data', 'fishao_net.json'), 'utf8'));
  const netById = new Map(net.fish.map(f => [f.id, f]));
  const zonesOf = f => [...new Set((f.places ?? []).map(p => ZONE.exec(p)?.[1]).filter(Boolean))].sort();

  const moray = data.allFishes.filter(f => f.locations.includes(MORAY)).map(f => {
    const n = netById.get(f.id);
    if (!n) throw new Error(`tracker fish ${f.id} not on fishao.net`);
    if (!n.locs.includes(204)) throw new Error(`tracker fish ${f.id} (${n.name}) is not a Moray tournament fish on fishao.net`);
    return { id: f.id, fishdex_id: n.fishdex_id, name: n.name, zones: zonesOf(f) };
  });
  const netMoray = net.fish.filter(f => f.locs.includes(204));
  const notInTracker = netMoray.filter(n => !moray.some(m => m.id === n.id)).map(n => n.name);

  // sanity check: Palm Island zones against fishao.net
  const palmDiff = data.allFishes.filter(f => f.locations.includes(PALM)).flatMap(f => {
    const n = netById.get(f.id);
    if (!n) return [];
    const a = zonesOf(f).join(''), b = zonesOf(n).join('');
    return a === b ? [] : [`${n.name}: tracker ${a || '—'}, fishao.net ${b || '—'}`];
  });

  const names_cs = {};
  for (const [id, v] of Object.entries(names)) if (v.cs && netById.has(+id)) names_cs[id] = v.cs;

  const out = {
    source: BASE,
    bundle,
    fetched_at: new Date().toISOString().slice(0, 10),
    zone_labels: labels,
    moray_tournament: moray,
    names_cs,
  };
  await writeFile(join(REPO, 'data', 'fishao_tracker.json'), JSON.stringify(out, null, 1) + '\n');

  const report = `# fishao-tracker.cz — report

Vygenerováno ${out.fetched_at} skriptem \`scraper/fishao_tracker.mjs\`. Soubor se přepisuje při každém běhu — needitovat ručně.

Fanouškovský tracker (${BASE}). Bereme z něj **zóny Moray turnaje** — fishao.net je nemá. Turnaj se chytá
na mapě Palm Islandu se stejnými zónami A–H; tracker je značí \`EFPT_PALM_ISLAND_ZONE_*\` jako fishao.net.
České názvy z trackeru jsou poslední záloha (po archivu a fishao.net).

Data jsou objektové literály v \`${bundle}\`; čtou se jako text, nespouštějí se.

## Zóny (popisky trackeru)

| zóna | tracker |
|---|---|
${Object.entries(labels).map(([z, l]) => `| ${z} | ${l} |`).join('\n')}

## Moray turnaj (${moray.length} ryb)

| id | ryba | zóny |
|---|---|---|
${moray.map(m => `| ${m.id} | ${m.name} | ${m.zones.join(', ') || '— (všechny)'} |`).join('\n')}

- ryby turnaje na fishao.net, které tracker nemá (${notInTracker.length}): ${notInTracker.join(', ') || '—'}

## Kontrola: zóny Palm Islandu proti fishao.net

${palmDiff.length ? `Liší se (${palmDiff.length}), platí fishao.net:\n\n${palmDiff.map(s => `- ${s}`).join('\n')}` : 'Shodné u všech ryb.'}
`;
  await writeFile(join(REPO, 'data', 'fishao-tracker-report.md'), report);
  console.log(`fishao_tracker: ${moray.length} Moray tournament fish, ${Object.keys(names_cs).length} cs names, ${palmDiff.length} Palm Island zone differences`);
  if (notInTracker.length) process.exitCode = 1;
}

await main();
