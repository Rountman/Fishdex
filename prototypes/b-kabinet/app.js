import { createApp } from '../shared/controller.js';
import { bait, spot, fmtTime, fmtSeason, areaName, BAIT_CS } from '../shared/data.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const numeral = r => `<span class="numeral n${r}" title="Rarita ${r} z 5"><span class="visually-hidden">Rarita </span>${ROMAN[r]}<span class="visually-hidden"> z V</span></span>`;
const unsure = (f, field) => f.uncertain.includes(field)
  ? `<abbr class="unsure" title="Nejisté: zdroje se liší">?</abbr>` : '';

const GLOW_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c2.5 3.2 5 6 5 9.2A5 5 0 0 1 7 12.2C7 9 9.5 6.2 12 3z"/><path d="M12 14.5v.01M9.8 11.8v.01M14 10.6v.01"/></svg>`;

let catNo = new Map();
const cat = f => `č. ${String(catNo.get(f.id)).padStart(3, '0')}`;

function where(f, areas) {
  return f.areas.map(a => {
    const spots = f.area_spots[a];
    return `${esc(areaName(areas, a))}${spots ? `, <em>${spots.map(spot).map(esc).join(', ')}</em>` : ''}`;
  });
}

function renderCard(f, s, { areas, img }) {
  const name = f.names.cs;
  return `
  <article class="card" data-id="${f.id}" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="card-hit" type="button" aria-pressed="${s.caught}"
      aria-label="${esc(name)}: ${s.caught ? 've sbírce' : 'chybí'}. Klik přepne ulovení, Shift+klik zářivou."></button>
    <div class="tray" data-fish-img><img src="${img(f)}" alt="" loading="lazy" decoding="async"></div>
    <div class="label n${f.rarity}">
      <p class="label-top"><span class="catno">${cat(f)}</span>${numeral(f.rarity)}</p>
      <h3 class="label-name">${esc(name)}</h3>
      <p class="label-en" lang="en">${esc(f.names.en)}</p>
      <p class="label-meta"><span>${where(f, areas)[0]}${f.areas.length > 1 ? ` +${f.areas.length - 1}` : ''}</span><span class="len">${f.max_length_label ? esc(f.max_length_label) : 'délka neznámá'}</span></p>
    </div>
    <span class="tag" aria-hidden="true">Uloveno</span>
    <button class="card-glow" type="button" aria-pressed="${s.caughtGlowing}" aria-label="Zářivá varianta: ${s.caughtGlowing ? 've sbírce' : 'chybí'}">${GLOW_ICON}</button>
    <button class="card-open" type="button" aria-label="Detail: ${esc(name)}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5"/><path d="M12.3 12.3 17 17"/></svg></button>
  </article>`;
}

function renderEmpty() {
  return `<div class="empty"><h2>Tahle přihrádka je prázdná</h2>
    <p>Hledání a filtrům neodpovídá žádný exponát.</p>
    <button class="brass-btn" data-filter="reset" type="button">Zrušit filtry</button></div>`;
}

function renderDetail(f, s, { areas, img }) {
  const t = fmtTime(f.time), se = fmtSeason(f.season);
  const row = (k, v, cls = '') => `<tr><th scope="row">${k}</th><td class="${cls}">${v}</td></tr>`;
  return `
  <div class="vit" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="vit-close" type="button" data-close aria-label="Zavřít">×</button>
    <figure class="vit-case">
      <div class="vit-tray" data-fish-img><img src="${img(f)}" alt="${esc(f.names.cs)}"></div>
      <figcaption>${f.max_length_label ? `Max. délka ${esc(f.max_length_label)}` : 'Délka neznámá'}</figcaption>
    </figure>
    <div class="vit-card">
      <p class="label-top"><span class="catno">${cat(f)}</span>${numeral(f.rarity)}</p>
      <h2>${esc(f.names.cs)}</h2>
      <p class="vit-en" lang="en">${esc(f.names.en)}</p>
      <table class="ledger">
        ${row('Lokalita', where(f, areas).join('<br>'))}
        ${row('Čas', `${esc(t.text)}${t.overnight ? ' <span class="aside">(přes půlnoc)</span>' : ''}${unsure(f, 'time')}`, t.unknown ? 'unknown' : '')}
        ${row('Sezóna', `${esc(se.text)}${unsure(f, 'season')}`)}
        ${row('Návnada', f.bait.map(b => `<span class="${BAIT_CS[b] ? '' : 'untranslated'}">${esc(bait(b))}</span>`).join(', ') + unsure(f, 'bait'))}
        ${row('Max. délka', f.max_length_label ? esc(f.max_length_label) : 'neznámá', f.max_length_label ? '' : 'unknown')}
      </table>
      <div class="vit-actions">
        <button class="switch" data-toggle="caught" aria-pressed="${s.caught}" type="button"><span class="dot" aria-hidden="true"></span>Uloveno</button>
        <button class="switch glow" data-toggle="caughtGlowing" aria-pressed="${s.caughtGlowing}" type="button"><span class="dot" aria-hidden="true"></span>Zářivá uloveno</button>
      </div>
    </div>
  </div>`;
}

let current = null;
function renderProgress({ total, caught, glow, byArea }) {
  document.getElementById('holdings').innerHTML = `
    <dl>
      <div><dt>Ve sbírce</dt><dd><span class="big">${caught}</span> z ${total}</dd>
        <span class="gauge"><span style="width:${caught / total * 100}%"></span></span></div>
      <div class="g"><dt>Zářivé</dt><dd><span class="big">${glow}</span> z ${total}</dd>
        <span class="gauge"><span style="width:${glow / total * 100}%"></span></span></div>
    </dl>`;
  const kinds = { tournament: 'Turnaj', backyard: '' };
  document.getElementById('drawers').innerHTML = byArea.map(a => `
    <button class="drawer ${a.kind}" type="button" data-filter="area" data-value="${a.id}" aria-pressed="${current?.area === a.id}">
      <span class="holder">
        ${kinds[a.kind] ? `<span class="kind">${kinds[a.kind]}</span>` : ''}
        <span class="dname">${esc(a.name.replace(/ Tournament$/, ''))}</span>
        <span class="dcount">${a.caught}/${a.total}</span>
      </span>
      <span class="knob" style="--p:${a.caught / a.total}"></span>
    </button>`).join('');
}

function setup({ all }, filters) {
  current = filters;
  catNo = new Map(all.map((f, i) => [f.id, i + 1]));
  const baits = [...new Set(all.flatMap(f => f.bait))].sort((a, b) => bait(a).localeCompare(bait(b), 'cs'));
  document.getElementById('bait').innerHTML = `<option value="">Všechny</option>` +
    baits.map(b => `<option value="${esc(b)}">${esc(bait(b))}</option>`).join('');
}

createApp({
  renderCard, renderEmpty, renderDetail, renderProgress, setup,
  countLabel: (n, total) => n === total ? `Vystaveno ${n} exponátů` : `Vystaveno ${n} z ${total}`,
  toastText: (f, field, on) => field === 'caught'
    ? `${f.names.cs}: ${on ? 'přidána do sbírky' : 'odebrána ze sbírky'}`
    : `${f.names.cs}: zářivá ${on ? 'přidána do sbírky' : 'odebrána ze sbírky'}`,
});
