// Fills the styleguide with live token values, WCAG contrast and real fish data.
import { BAIT_CS, SPOT_CS, fmtTime, fmtSeason } from './shared/data.js';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
if (params.get('theme')) root.dataset.theme = params.get('theme');
document.getElementById('theme').addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  paintLive();
});

const tok = name => getComputedStyle(root).getPropertyValue(name).trim();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const ICONS = {
  glow: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2"/></svg>`,
  house: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path class="pond" d="M9 15.5c1 .8 2 .8 3 0s2-.8 3 0"/></svg>`,
};
const fillIcons = (scope = document) => scope.querySelectorAll('[data-icon]').forEach(b => { b.innerHTML = ICONS[b.dataset.icon]; });

// ---------- colour swatches ----------
const GROUPS = [
  ['Povrchy', [
    ['--color-paper', 'stránka, milimetrový papír'], ['--color-paper-deep', 'hover na papíře'],
    ['--color-slip', 'lístek, panel, dialog'], ['--color-grid-bold', 'linky 1 cm, prázdný progres'],
    ['--color-grid-fine', 'linky 1 mm'], ['--color-backdrop', 'pozadí pod modalem']]],
  ['Inkoust', [
    ['--color-ink', 'text, primární tlačítko'], ['--color-ink-soft', 'sekundární text'],
    ['--color-ink-faint', 'terciární text, čárkovaný okraj'], ['--color-on-ink', 'text na inkoustu']]],
  ['Akcenty', [
    ['--color-stamp', 'razítko ULOVENO, nejisté „?“'], ['--color-tape', 'páska na lístku'],
    ['--color-focus', 'focus ring'], ['--color-danger', 'Nahradit, chyba'], ['--color-warn', 'upozornění']]],
  ['Bioluminiscence', [
    ['--color-night', 'noční voda pod zářivou rybou'], ['--color-glow', 'světlo, ovladač záře'],
    ['--color-glow-soft', 'rozptyl záře'], ['--color-plankton', 'body planktonu'], ['--color-stamp-on-night', 'razítko v noci']]],
];
function paintSwatches() {
  document.getElementById('swatches').innerHTML = GROUPS.map(([title, items]) => `
    <h3 class="t-h4 sg-sub">${title}</h3>
    <div class="grid-sw">${items.map(([name, role]) => `
      <div class="sw"><div class="sw-chip"><span style="background:var(${name})"></span></div>
        <div class="sw-body"><code>${name}</code><p>${role}</p><p class="sw-val">${esc(tok(name))}</p></div></div>`).join('')}</div>`).join('');
}

// ---------- contrast (both themes) ----------
const canvas = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
const ctx = canvas.getContext('2d', { willReadFrequently: true });
function rgbOf(fg, bg) {
  // resolve var() to a concrete colour string through a probe element
  const probe = document.createElement('span');
  document.body.append(probe);
  const resolve = name => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
  const [paper, b, f] = [resolve('--color-paper'), resolve(bg), resolve(fg)];
  probe.remove();
  // translucent colours are composited on the page paper, as on screen
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = b; ctx.fillRect(0, 0, 1, 1);
  const bgPx = [...ctx.getImageData(0, 0, 1, 1).data];
  ctx.fillStyle = f; ctx.fillRect(0, 0, 1, 1);
  return [[...ctx.getImageData(0, 0, 1, 1).data], bgPx];
}
const lum = ([r, g, b]) => {
  const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

const PAIRS = [
  ['--color-ink', '--color-paper', 4.5, 'text'], ['--color-ink', '--color-slip', 4.5, 'text'],
  ['--color-ink-soft', '--color-paper', 4.5, 'text'], ['--color-ink-soft', '--color-slip', 4.5, 'text'],
  ['--color-ink-faint', '--color-paper', 4.5, 'text: počty, placeholder'], ['--color-ink-faint', '--color-slip', 4.5, 'text: počty'],
  ['--color-on-ink', '--color-ink', 4.5, 'text na tlačítku'],
  ['--color-stamp', '--color-slip', 4.5, 'razítko, „?“'], ['--color-stamp-on-night', '--color-night', 4.5, 'razítko v noci'],
  ['--color-glow', '--color-night', 3, 'ovladač záře'], ['--color-danger', '--color-slip', 4.5, 'text „Nahradit“'],
  ['--color-focus', '--color-paper', 3, 'focus ring'], ['--color-focus', '--color-slip', 3, 'focus ring'],
  ['--color-ink-faint', '--color-paper', 3, 'okraj nechycené karty'],
  ...[1, 2, 3, 4, 5].flatMap(r => [[`--rarity-${r}`, '--color-paper', 3, `hvězdy ${r}`], [`--rarity-${r}`, '--color-slip', 3, `hvězdy ${r}`]]),
];
function measureAll() {
  const keep = root.dataset.theme;
  const out = {};
  for (const theme of ['light', 'dark']) {
    root.dataset.theme = theme;
    out[theme] = PAIRS.map(([fg, bg]) => { const [f, b] = rgbOf(fg, bg); return ratio(f, b); });
  }
  if (keep) root.dataset.theme = keep; else delete root.dataset.theme;
  return out;
}
function paintContrast() {
  const m = measureAll();
  const cell = (v, need) => `<span class="${v >= need ? 'ok' : 'bad'}">${v.toFixed(2).replace('.', ',')}</span>`;
  document.getElementById('contrast').innerHTML = `
    <thead><tr><th>Popředí</th><th>Pozadí</th><th>Použití</th><th>Potřeba</th><th>Ukázka</th><th>Světlý</th><th>Tmavý</th></tr></thead>
    <tbody>${PAIRS.map(([fg, bg, need, use], i) => `<tr>
      <td class="tok">${fg}</td><td class="tok">${bg}</td><td>${use}</td><td>${String(need).replace('.', ',')} : 1</td>
      <td><span class="pair" style="color:var(${fg});background:var(${bg})">Aa ★</span></td>
      <td>${cell(m.light[i], need)}</td><td>${cell(m.dark[i], need)}</td></tr>`).join('')}</tbody>`;
  window.__contrast = PAIRS.map(([fg, bg, need], i) => ({ fg, bg, need, light: +m.light[i].toFixed(2), dark: +m.dark[i].toFixed(2) }));
}

// ---------- rarity ----------
function paintRarity() {
  document.getElementById('rarity').innerHTML = `<div class="ct-wrap"><table class="ct">
    <thead><tr><th>Token</th><th>Značka</th><th>Na papíře</th><th>Na lístku</th><th>Ve filtru</th><th>Čtečka</th></tr></thead>
    <tbody>${[1, 2, 3, 4, 5].map(r => `<tr>
      <td class="tok">--rarity-${r}</td><td>${r}× ★</td>
      <td style="background:var(--color-paper)"><span class="stars" data-r="${r}" style="font-size:16px">${'★'.repeat(r)}</span></td>
      <td style="background:var(--color-slip)"><span class="stars" data-r="${r}" style="font-size:16px">${'★'.repeat(r)}</span></td>
      <td><button class="chip" aria-pressed="false" type="button"><span class="stars" data-r="${r}">${'★'.repeat(r)}</span></button>
          <button class="chip" aria-pressed="true" type="button"><span class="stars" data-r="${r}">${'★'.repeat(r)}</span></button></td>
      <td>„rarita ${r} z 5“</td></tr>`).join('')}</tbody></table></div>`;
}

function paintSpaces() {
  document.getElementById('spaces').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n =>
    `<div class="space-row"><code>--space-${n}</code><span>${tok(`--space-${n}`)}</span><span class="space-bar" style="width:var(--space-${n})"></span></div>`).join('');
}

// ---------- real fish ----------
const all = await fetch('../data/fish.json').then(r => r.json());
const areas = await fetch('../data/areas.json').then(r => r.json());
const F = id => all.find(f => f.id === id);
const img = f => `../${f.image}`;
const areaName = id => areas.find(a => a.id === id)?.name ?? id;
const spot = s => (SPOT_CS[s] ?? s).replace(/\b([zvksuoai]) /g, '$1 ');
const where = f => f.areas.map(a => `${esc(areaName(a))}${f.area_spots[a] ? ` <span class="note">${f.area_spots[a].map(spot).map(esc).join(', ')}</span>` : ''}`);
const stars = r => `<span class="stars" data-r="${r}" role="img" aria-label="rarita ${r} z 5">${'★'.repeat(r)}</span>`;

function card(f, s, cls = '') {
  const w = where(f), yard = f.areas.includes('backyard');
  return `<article class="card ${cls}" data-caught="${s.caught}" data-glow="${s.glow}">
    <button class="card__hit" type="button" aria-pressed="${s.caught}" aria-label="${esc(f.names.cs)}: ${s.caught ? 'ulovena' : 'neulovena'}"></button>
    <div class="card__art" data-fish-img><img src="${img(f)}" alt=""><span class="stamp" aria-hidden="true">Uloveno</span></div>
    <div>
      <h3 class="card__name">${esc(f.names.cs)}</h3>
      <p class="card__alt" lang="en">${esc(f.names.en)}</p>
      <p class="card__meta">${stars(f.rarity)}<span class="len">${f.max_length_label ? esc(f.max_length_label) : 'délka neznámá'}</span></p>
      <p class="card__where">${w[0]}${w.length > 1 ? ` <span class="t-faint">+${w.length - 1}</span>` : ''}</p>
      ${yard && s.bred ? '<p class="card__bred">mám za domem</p>' : ''}
    </div>
    <button class="icon-btn icon-btn--glow" type="button" aria-pressed="${s.glow}" aria-label="Zářivá varianta" data-icon="glow"></button>
    ${yard ? `<button class="icon-btn icon-btn--bred" type="button" aria-pressed="${!!s.bred}" aria-label="Za domem" data-icon="house"></button>` : ''}
    <button class="card__open" type="button">Zápis</button>
  </article>`;
}
const S = (caught, glow, bred = false) => ({ caught, glow, bred });
const CARDS = [
  ['Neuloveno', 'arapaima', S(false, false)], ['Uloveno', 'arapaima', S(true, false)],
  ['Jen zářivá', 'arapaima', S(false, true)], ['Uloveno + zářivá', 'arapaima', S(true, true)],
  ['Hover', 'blue-tang', S(false, false), 'is-hover'], ['Focus z klávesnice', 'blue-tang', S(true, false), 'is-focus'],
  ['Dlouhý stisk 500 ms', 'blue-tang', S(true, false), 'is-pressing is-frozen'],
  ['Backyard: mám za domem', 'fire-eel', S(true, false, true)],
  ['Nejdelší CZ jméno', 'redfin-pickerel', S(true, false)], ['Bez délky, široký obrázek', 'golden-gar', S(false, false)],
];
document.getElementById('cards').innerHTML = CARDS.map(([label, id, s, cls]) =>
  `<figure><figcaption>${label}</figcaption>${card(F(id), s, cls)}</figure>`).join('');
document.getElementById('cards').inert = true;

document.querySelector('[data-fish="arapaima"]').src = img(F('arapaima'));

const counts = {};
for (const f of all) for (const b of f.bait) counts[b] = (counts[b] ?? 0) + 1;
document.getElementById('baits').innerHTML = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((b, i) => `
  <li><label class="check"><input type="checkbox" ${i < 2 ? 'checked' : ''}>
    <span class="label" ${BAIT_CS[b] ? '' : 'style="font-style:italic"'}>${esc(BAIT_CS[b] ?? b)}</span><span class="leader"></span><span class="n">${counts[b]}</span></label></li>`).join('');

const ng = F('nassau-grouper');
const t = fmtTime(ng.time);
document.getElementById('panel-stage').innerHTML = `
  <article class="panel">
    <button class="icon-btn icon-btn--close" type="button" aria-label="Zavřít">×</button>
    ${stars(ng.rarity)}
    <h2 class="t-h1" style="padding-right:var(--space-7);margin-top:var(--space-2)">${esc(ng.names.cs)}</h2>
    <p class="t-meta" lang="en" style="margin:var(--space-2) 0 0;font-size:var(--fs-body)">${esc(ng.names.en)}</p>
    <div class="specimen" data-glow="true" data-fish-img><img src="${img(ng)}" alt="${esc(ng.names.cs)}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-5)">
      <button class="toggle" aria-pressed="false" type="button"><span class="box" aria-hidden="true"></span>Ulovena</button>
      <button class="toggle toggle--glow" aria-pressed="true" type="button"><span class="box" aria-hidden="true"></span>Zářivá ulovena</button>
    </div>
    <dl class="facts">
      <dt>Kde</dt><dd>${where(ng).join('<br>')}</dd>
      <dt>Kdy</dt><dd>${esc(t.text)}${t.overnight ? ' <span class="note">přes půlnoc</span>' : ''}</dd>
      <dt>Sezóna</dt><dd>${esc(fmtSeason(ng.season).text)}</dd>
      <dt>Návnada</dt><dd>${ng.bait.map(b => BAIT_CS[b] ?? b).join(', ')}</dd>
      <dt>Délka</dt><dd>${esc(ng.max_length_label ?? 'neznámá')}</dd>
    </dl>
  </article>`;

// cap fish images at 2× natural size
document.addEventListener('load', e => {
  const i = e.target;
  if (i.tagName === 'IMG' && i.closest('[data-fish-img]')) { i.style.maxWidth = `${i.naturalWidth * 2}px`; i.style.maxHeight = `${i.naturalHeight * 2}px`; }
}, true);

function paintLive() { paintSwatches(); paintSpaces(); }
fillIcons();
paintRarity();
paintLive();
await document.fonts.ready;
paintContrast();
document.body.dataset.ready = 'true';
