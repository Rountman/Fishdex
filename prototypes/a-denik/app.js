import { createApp } from '../shared/controller.js';
import { bait, spot, fmtTime, fmtSeason, areaName, BAIT_CS } from '../shared/data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stars = r => `<span class="stars r${r}" aria-label="rarita ${r} z 5">${'★'.repeat(r)}</span>`;
const unsure = (f, field) => f.uncertain.includes(field)
  ? `<abbr class="unsure" title="Nejisté: zdroje se liší">?</abbr>` : '';

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
    </div>
    <button class="card-glow" type="button" aria-pressed="${s.caughtGlowing}" aria-label="Zářivá varianta: ${s.caughtGlowing ? 'ulovena' : 'neulovena'}">${GLOW_ICON}</button>
    <button class="card-open" type="button">Zápis<span class="visually-hidden"> o rybě ${esc(name)}</span></button>
  </article>`;
}

function renderEmpty() {
  return `<div class="empty"><p class="empty-title">Na téhle stránce nic.</p>
    <p>Žádná ryba neodpovídá hledání a filtrům.</p>
    <button class="ink-btn" data-filter="reset" type="button">Zrušit filtry</button></div>`;
}

function ruler(f) {
  const cm = f.max_length_cm?.max;
  if (!cm) return `<p class="ruler-none">Délka neznámá</p>`;
  return `<div class="ruler" aria-hidden="true"><span>0</span><span class="ruler-line"></span><span>${esc(f.max_length_label)}</span></div>`;
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
      ${ruler(f)}
      <span class="stamp" aria-hidden="true">Uloveno</span>
    </figure>
    <div class="sheet-actions">
      <button class="toggle" data-toggle="caught" aria-pressed="${s.caught}" type="button">
        <span class="box" aria-hidden="true"></span>Ulovena</button>
      <button class="toggle glow" data-toggle="caughtGlowing" aria-pressed="${s.caughtGlowing}" type="button">
        <span class="box" aria-hidden="true"></span>Zářivá ulovena</button>
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
  let html = '', lastKind = '';
  for (const a of byArea) {
    if (a.kind !== lastKind) { html += `<li class="kind">${kinds[a.kind]}</li>`; lastKind = a.kind; }
    html += `<li><button type="button" data-filter="area" data-value="${a.id}" aria-pressed="${current?.area === a.id}">
      <span class="area-name">${esc(a.name)}</span>
      <span class="area-count">${a.caught}<span class="of">/${a.total}</span></span>
      <span class="pencil-bar"><span style="width:${a.caught / a.total * 100}%"></span></span>
    </button></li>`;
  }
  document.getElementById('areas').innerHTML = html;
}

let current = null;
function setup({ all, areas }, filters) {
  current = filters;
  const baits = [...new Set(all.flatMap(f => f.bait))].sort((a, b) => bait(a).localeCompare(bait(b), 'cs'));
  document.getElementById('bait').innerHTML = `<option value="">Všechny</option>` +
    baits.map(b => `<option value="${esc(b)}">${esc(bait(b))}</option>`).join('');
  document.getElementById('area').innerHTML = `<option value="">Všechny</option>` +
    areas.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
  // keep the area <select> (mobile) and the index buttons (desktop) in sync
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-filter="area"]');
    if (b) setTimeout(() => (document.getElementById('area').value = filters.area));
  });
}

createApp({
  renderCard, renderEmpty, renderDetail, renderProgress, setup,
  countLabel: (n, total) => n === total ? `${n} ryb` : `${n} z ${total}`,
  toastText: (f, field, on) => field === 'caught'
    ? `${f.names.cs}: ${on ? 'zapsána jako ulovená' : 'ulovení smazáno'}`
    : `${f.names.cs}: ${on ? 'zapsána zářivá' : 'zářivá smazána'}`,
});
