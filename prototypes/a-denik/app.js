import { createApp } from '../shared/controller.js';
import { bait, spot, fmtTime, fmtSeason, areaName, BAIT_CS } from '../shared/data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stars = r => `<span class="stars r${r}" aria-label="rarita ${r} z 5">${'★'.repeat(r)}</span>`;
const unsure = (f, field) => f.uncertain.includes(field)
  ? `<abbr class="unsure" title="Nejisté: zdroje se liší">?</abbr>` : '';

const HOUSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path class="pond" d="M9 15.5c1 .8 2 .8 3 0s2-.8 3 0"/></svg>`;
const isYard = f => f.areas.includes('backyard');

const GLOW_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2"/></svg>`;

function where(f, areas) {
  return f.areas.map(a => {
    const spots = f.area_spots[a];
    return `${esc(areaName(areas, a))}${spots ? ` <span class="note">${spots.map(spot).map(esc).join(', ')}</span>` : ''}`;
  });
}

function renderCard(f, s, { areas, img }) {
  const name = f.names.cs;
  const where0 = where(f, areas);
  return `
  <article class="card" data-id="${f.id}" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="card-hit" type="button" aria-pressed="${s.caught}"
      aria-label="${esc(name)}: ${s.caught ? 'ulovena' : 'neulovena'}. Klik přepne ulovení, Shift+klik zářivou."></button>
    <div class="card-art" data-fish-img><img src="${img(f)}" alt="" loading="lazy" decoding="async">
      <span class="stamp" aria-hidden="true">Uloveno</span></div>
    <div class="card-text">
      <h3 class="card-name">${esc(name)}</h3>
      <p class="card-en" lang="en">${esc(f.names.en)}</p>
      <p class="card-meta">${stars(f.rarity)}<span class="len">${f.max_length_label ? esc(f.max_length_label) : 'délka neznámá'}</span></p>
      <p class="card-where">${where0[0]}${where0.length > 1 ? ` <span class="more">+${where0.length - 1}</span>` : ''}</p>
      ${isYard(f) && s.bred ? `<p class="bred-note">mám za domem</p>` : ''}
    </div>
    <button class="card-glow" type="button" aria-pressed="${s.caughtGlowing}" aria-label="Zářivá varianta: ${s.caughtGlowing ? 'ulovena' : 'neulovena'}">${GLOW_ICON}</button>
    ${isYard(f) ? `<button class="card-bred" type="button" aria-pressed="${!!s.bred}" aria-label="Za domem: ${s.bred ? 'mám' : 'nemám'}">${HOUSE_ICON}</button>` : ''}
    <button class="card-open" type="button">Zápis<span class="visually-hidden"> o rybě ${esc(name)}</span></button>
  </article>`;
}

function renderEmpty() {
  return `<div class="empty"><p class="empty-title">Na téhle stránce nic.</p>
    <p>Žádná ryba neodpovídá hledání a filtrům.</p>
    <button class="ink-btn" data-filter="reset" type="button">Zrušit filtry</button></div>`;
}

function renderDetail(f, s, { areas, img }) {
  const t = fmtTime(f.time), se = fmtSeason(f.season);
  return `
  <article class="sheet" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="sheet-close" type="button" data-close aria-label="Zavřít">×</button>
    <header class="sheet-head">
      <p class="sheet-rarity">${stars(f.rarity)}</p>
      <h2>${esc(f.names.cs)}</h2>
      <p class="sheet-en" lang="en">${esc(f.names.en)}</p>
    </header>
    <figure class="sheet-art">
      <div class="specimen" data-fish-img><img src="${img(f)}" alt="${esc(f.names.cs)}"></div>
      <span class="stamp" aria-hidden="true">Uloveno</span>
    </figure>
    <div class="sheet-actions">
      <button class="toggle" data-toggle="caught" aria-pressed="${s.caught}" type="button">
        <span class="box" aria-hidden="true"></span>Ulovena</button>
      <button class="toggle glow" data-toggle="caughtGlowing" aria-pressed="${s.caughtGlowing}" type="button">
        <span class="box" aria-hidden="true"></span>Zářivá ulovena</button>
      ${isYard(f) ? `<button class="toggle bred" data-toggle="bred" aria-pressed="${!!s.bred}" type="button">
        <span class="box" aria-hidden="true"></span>Mám za domem</button>` : ''}
    </div>
    <dl class="facts">
      <dt>Kde</dt><dd>${where(f, areas).join('<br>')}</dd>
      <dt>Kdy</dt><dd class="${t.unknown ? 'unknown' : ''}">${esc(t.text)}${t.overnight ? ' <span class="note">přes půlnoc</span>' : ''}${unsure(f, 'time')}</dd>
      <dt>Sezóna</dt><dd>${esc(se.text)}${unsure(f, 'season')}</dd>
      <dt>Návnada</dt><dd>${f.bait.map(b => `<span class="${BAIT_CS[b] ? '' : 'untranslated'}">${esc(bait(b))}</span>`).join(', ')}${unsure(f, 'bait')}</dd>
      <dt>Délka</dt><dd class="${f.max_length_label ? '' : 'unknown'}">${f.max_length_label ? esc(f.max_length_label) : 'neznámá'}</dd>
    </dl>
  </article>`;
}

function renderProgress({ total, caught, glow, byArea }) {
  const pct = n => (n / total * 100).toFixed(1).replace('.', ',');
  document.getElementById('tally').innerHTML = `
    <div class="tally-item">
      <span class="tally-num">${caught}<span class="of">/${total}</span></span>
      <span class="tally-label">ulovených ryb <span class="pct">${pct(caught)} %</span></span>
      <span class="pencil-bar"><span style="width:${caught / total * 100}%"></span></span>
    </div>
    <div class="tally-item glowing">
      <span class="tally-num">${glow}<span class="of">/${total}</span></span>
      <span class="tally-label">zářivých <span class="pct">${pct(glow)} %</span></span>
      <span class="pencil-bar"><span style="width:${glow / total * 100}%"></span></span>
    </div>`;
  const kinds = { area: 'Oblasti', tournament: 'Turnaje', backyard: 'Za domem' };
  let html = `<li class="all"><button type="button" data-filter="area" data-value="" aria-pressed="${!current?.area}">
      <span class="area-name">Všechny oblasti</span>
      <span class="area-count">${caught}<span class="of">/${total}</span></span>
      <span class="pencil-bar"><span style="width:${caught / total * 100}%"></span></span>
    </button></li>`, lastKind = '';
  for (const a of byArea) {
    if (a.kind !== lastKind) { html += `<li class="kind">${kinds[a.kind]}</li>`; lastKind = a.kind; }
    html += `<li><button type="button" data-filter="area" data-value="${a.id}" aria-pressed="${current?.area === a.id}">
      <span class="area-name">${esc(a.name)}</span>
      <span class="area-count">${a.caught}<span class="of">/${a.total}</span></span>
      <span class="pencil-bar"><span style="width:${a.caught / a.total * 100}%"></span></span>
      ${a.kind === 'backyard' ? `<span class="area-bred">mám za domem ${a.bred}<span class="of">/${a.total}</span></span>` : ''}
    </button></li>`;
  }
  document.getElementById('areas').innerHTML = html;
}

let current = null;
function setup({ all, areas }, filters) {
  current = filters;
  // bait list sorted by how many fish take it (counts from the full data set)
  const counts = {};
  for (const f of all) for (const b of f.bait) counts[b] = (counts[b] ?? 0) + 1;
  const baits = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || bait(a).localeCompare(bait(b), 'cs'));
  document.getElementById('bait-list').innerHTML = baits.map(b => `
    <li><label class="bait-opt">
      <input type="checkbox" data-filter="bait" data-value="${esc(b)}">
      <span class="bait-name ${BAIT_CS[b] ? '' : 'untranslated'}">${esc(bait(b))}</span>
      <span class="leader" aria-hidden="true"></span>
      <span class="bait-count">${counts[b]}<span class="visually-hidden"> ryb</span></span>
    </label></li>`).join('');
  const btn = document.getElementById('bait-btn'), panel = document.getElementById('bait-panel');
  const setOpen = open => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-close-panel]').addEventListener('click', () => { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.bait-picker')) setOpen(false); });
  if (new URLSearchParams(location.search).get('baitpanel')) setOpen(true);
  document.getElementById('area').innerHTML = `<option value="">Všechny oblasti</option>` +
    areas.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
}

function onFilters(filters) {
  const sel = [...filters.bait];
  document.getElementById('bait-btn-value').textContent =
    sel.length === 0 ? 'všechny' : sel.length === 1 ? bait(sel[0]) : `${sel.length} vybrané`;
  document.getElementById('bait-chips').innerHTML = sel.map(b =>
    `<button type="button" class="chip removable" data-filter="bait" data-value="${esc(b)}" aria-label="Zrušit návnadu ${esc(bait(b))}">${esc(bait(b))}<span aria-hidden="true">×</span></button>`).join('');
  document.getElementById('bred-row').hidden = filters.area !== 'backyard';
  const area = document.getElementById('area');
  if (area.value !== filters.area) area.value = filters.area;
}

createApp({
  renderCard, renderEmpty, renderDetail, renderProgress, setup, onFilters,
  countLabel: (n, total) => n === total ? `${n} ryb` : `${n} z ${total}`,
  toastText: (f, field, on) => field === 'caught'
    ? `${f.names.cs}: ${on ? 'zapsána jako ulovená' : 'ulovení smazáno'}`
    : field === 'bred' ? `${f.names.cs}: ${on ? 'zapsána za domem' : 'odebrána ze dvorku'}`
    : `${f.names.cs}: ${on ? 'zapsána zářivá' : 'zářivá smazána'}`,
});
