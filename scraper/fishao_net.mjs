// Official Fishao wiki (www.fishao.net/wiki) -> data/fishao_net.json + data/fishao-net-report.md.
//
// The wiki is a SvelteKit app: the whole fish database is one object literal in a JS chunk.
// The chunk is read as TEXT by the literal parser in literal.mjs and is never executed.
// Palm Island zones come from the SVG grid on /wiki/areas/palm-island.
// Czech fish names: only the server-rendered fish pages carry them (/wiki/fish/<id> with
// Accept-Language: cs, the <h1>), so the first run fetches one page per fish (~10 min).
//
// Polite: max 1 request/s, every response cached in scraper/cache/fishao_net/ (gitignored).
// Run: node scraper/fishao_net.mjs   [--refresh  = refetch the HTML pages, chunks stay cached]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLiteral } from './literal.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const CACHE = join(HERE, 'cache', 'fishao_net');
const BASE = 'https://www.fishao.net';
const UA = 'FishdexScraper/1.0 (fan project; polite, cached, 1 req/s)';
const REFRESH = process.argv.includes('--refresh');

let last = 0;
/** Cached GET; `binary` returns a Buffer (images), otherwise text. */
async function get(path, { immutable = false, binary = false, lang = null } = {}) {
  const key = lang ? `${lang}:${path}` : path;
  const file = join(CACHE, createHash('sha1').update(key).digest('hex').slice(0, 16) + (binary ? '.bin' : '.txt'));
  if (existsSync(file) && (immutable || !REFRESH)) return binary ? readFile(file) : readFile(file, 'utf8');
  const wait = last + 1000 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(BASE + path, { headers: { 'User-Agent': UA, ...(lang && { 'Accept-Language': lang }) } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
  await writeFile(file, body);
  return body;
}
// --- fish id matching (same normalisation as the Python scraper) ---------------------------
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  await mkdir(CACHE, { recursive: true });

  // 1. the chunk holding the database is a modulepreload of the fish list page
  const page = await get('/wiki/fish');
  const chunks = [...new Set([...page.matchAll(/\/_app\/immutable\/[^"']+\.js/g)].map(m => m[0]))];
  let bundle = null, src = '';
  for (const c of chunks) {
    const body = await get(c, { immutable: true });
    if (body.includes('{fish:[')) { bundle = c; src = body; break; }
  }
  if (!bundle) throw new Error('no chunk with {fish:[ found, the wiki layout changed');
  const db = parseLiteral(src, src.indexOf('{fish:['));

  // 2. Palm Island zones: 13x13 grid of <rect>s per zone, "." = land / no zone
  const palm = await get('/wiki/areas/palm-island');
  const svgStart = palm.indexOf('<svg viewBox="0 0 12.5 12.5"');
  if (svgStart < 0) throw new Error('Palm Island zone grid not found');
  const svg = palm.slice(svgStart, palm.indexOf('</svg>', svgStart));
  // the zone grid is laid over this square map: viewBox 0 0 12.5 12.5, so one cell = width / 12.5
  const mapSrc = /<img src="([^"]+)" alt="Map of Palm Island"/.exec(palm)?.[1];
  if (!mapSrc) throw new Error('Palm Island map image not found');
  await mkdir(join(REPO, 'images', 'maps'), { recursive: true });
  await writeFile(join(REPO, 'images', 'maps', 'palm-island.webp'), await get(mapSrc, { binary: true }));
  if (!/viewBox="0 0 12\.5 12\.5"/.test(palm)) throw new Error('zone grid viewBox changed');
  const grid = Array.from({ length: 13 }, () => Array(13).fill('.'));
  for (const g of svg.matchAll(/aria-label="Zone (\w)"[^>]*>(.*?)<\/g>/g)) {
    for (const r of g[2].matchAll(/x="(\d+)" y="(\d+)"/g)) {
      if (grid[+r[2]][+r[1]] !== '.') throw new Error(`zone cell ${r[1]},${r[2]} in two zones`);
      grid[+r[2]][+r[1]] = g[1];
    }
  }

  // 3. match to fishdex ids
  const ours = JSON.parse(await readFile(join(REPO, 'data', 'fish.json'), 'utf8'));
  const aliases = JSON.parse(await readFile(join(HERE, 'aliases.json'), 'utf8')).fishao_net ?? {};
  const byId = new Set(ours.map(f => f.id));
  const byEn = new Map(ours.map(f => [norm(f.names.en), f.id]));
  const unmatched = [];
  const used = new Map();
  for (const f of db.fish) {
    const id = aliases[f.name] ?? (byId.has(norm(f.name)) ? norm(f.name) : byEn.get(norm(f.name)));
    if (!id || !byId.has(id)) { unmatched.push(f.name); f.fishdex_id = null; continue; }
    if (used.has(id)) throw new Error(`${f.name} and ${used.get(id)} both match ${id}`);
    used.set(id, f.name);
    f.fishdex_id = id;
  }
  const missing = ours.filter(f => !used.has(f.id)).map(f => f.id);

  // 4. Czech names from the fish pages; the wiki falls back to the English name when it has none
  const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  let done = 0;
  for (const f of db.fish) {
    const html = await get(`/wiki/fish/${f.id}`, { lang: 'cs' });
    if (!/<main lang="cs"/.test(html)) throw new Error(`/wiki/fish/${f.id}: not served in Czech`);
    const h1 = /<h1[^>]*>([^<]+)/.exec(html)?.[1]?.trim();
    if (!h1) throw new Error(`/wiki/fish/${f.id}: no <h1>`);
    f.name_cs = decode(h1);
    if (++done % 50 === 0) console.log(`  cs names: ${done}/${db.fish.length}`);
  }
  const ourById = new Map(ours.map(f => [f.id, f]));
  const csRows = db.fish.filter(f => f.fishdex_id).map(f => ({ f, o: ourById.get(f.fishdex_id) }));
  const csNew = csRows.filter(({ f, o }) => o.names.cs === o.names.en && f.name_cs !== f.name);
  const csDiff = csRows.filter(({ f, o }) => o.names.cs !== o.names.en && f.name_cs !== f.name && f.name_cs !== o.names.cs);
  const csNone = csRows.filter(({ f }) => f.name_cs === f.name);

  const out = {
    source: `${BASE}/wiki`,
    bundle,
    fetched_at: new Date().toISOString().slice(0, 10),
    fish: db.fish,
    locations: db.locations,
    bait_categories: db.baitCategories,
    palm_island_zones: grid.map(r => r.join('')),
  };
  await writeFile(join(REPO, 'data', 'fishao_net.json'), JSON.stringify(out, null, 1) + '\n');

  const count = k => db.fish.filter(k).length;
  const report = `# fishao.net — report

Vygenerováno ${out.fetched_at} skriptem \`scraper/fishao_net.mjs\`. Soubor se přepisuje při každém běhu — needitovat ručně.

Oficiální wiki (${out.source}) je **hlavní zdroj** pro výskyt (oblasti, místa, zóny Palm Islandu), raritu,
vzácnost v rámci hvězd, návnady, čas, sezónu, délky, chov a odemykání. České názvy a světové rekordy
zůstávají z fishao.cz / fishaowiki (\`data/report.md\`); český název z fishao.net (\`name_cs\`, ze stránky
ryby v češtině) doplní jen rybu, která v archivu český název neměla (tam je kopie anglického).

Data jsou objektový literál v \`${bundle}\`; čte se jako text, nespouští se.

## Souhrn

- ryb: ${db.fish.length}, spárováno s \`data/fish.json\`: ${db.fish.length - unmatched.length}
- nespárované z fishao.net (${unmatched.length}): ${unmatched.join(', ') || '—'}
- ryby z \`data/fish.json\` bez protějšku (${missing.length}): ${missing.join(', ') || '—'}
- s místem uvnitř oblasti (\`places\`): ${count(f => f.places.length)}
- „× vzácnější“ (\`factor\` < 1): ${count(f => f.factor < 1)}
- chov u Rexe (\`breed\`): ${count(f => f.breed)}
- odemknutí kolekcí: ${count(f => f.collections.length)}, ovocným kombem: ${count(f => f.fruitCombos.length)}, klubovými body: ${count(f => f.clubPoints)}, předčasně za fishcoiny: ${count(f => f.clubPrice)}

## Lokace

| id | název | ryb |
|---|---|---|
${db.locations.map(l => `| ${l.id} | ${l.name} | ${count(f => f.locs.includes(l.id))} |`).join('\n')}

## České názvy (fishao.net)

- doplněné, v archivu jen anglický název (${csNew.length}): ${csNew.map(({ f }) => `${f.name} → **${f.name_cs}**`).join(', ') || '—'}
- fishao.net český název nemá, ukazuje anglický (${csNone.length}): ${csNone.map(({ f }) => f.name).join(', ') || '—'}
- jiný než náš z archivu, ponechán náš (${csDiff.length}):
${csDiff.map(({ f, o }) => `  - \`${o.id}\`: náš **${o.names.cs}**, fishao.net ${f.name_cs}`).join('\n') || '  —'}

## Palm Island — zóny (13 × 13, „.“ = pevnina)

\`\`\`
${out.palm_island_zones.map(r => r.split('').join(' ')).join('\n')}
\`\`\`
`;
  await writeFile(join(REPO, 'data', 'fishao-net-report.md'), report);
  console.log(`fishao_net: ${db.fish.length} fish (${unmatched.length} unmatched, ${missing.length} of ours missing), bundle ${bundle}`);
  if (unmatched.length || missing.length) process.exitCode = 1;
}

await main();
