import { createApp } from '../shared/controller.js';
import { areaName } from '../shared/data.js';
import { t, lang, name, altName, altLang, bait, baitTranslated, spot, fmtTime, fmtSeason, pct, date } from './i18n.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stars = r => `<span class="stars r${r}" role="img" aria-label="${t.rarityAria(r)}">${'★'.repeat(r)}</span>`;
const unsure = (f, field) => f.uncertain.includes(field)
  ? `<abbr class="unsure" title="${t.unsure}">?</abbr>` : '';
const bar = (n, total, cls = '') => `<span class="pencil-bar ${cls}"><span style="width:${total ? n / total * 100 : 0}%"></span></span>`;

const HOUSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path class="pond" d="M9 15.5c1 .8 2 .8 3 0s2-.8 3 0"/></svg>`;
const GLOW_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2"/></svg>`;
const isYard = f => f.areas.includes('backyard');

function where(f, areas) {
  return f.areas.map(a => {
    const spots = f.area_spots[a];
    return `${esc(areaName(areas, a))}${spots ? ` <span class="note">${spots.map(spot).map(esc).join(', ')}</span>` : ''}`;
  });
}

function renderCard(f, s, { areas, img }) {
  const n = name(f);
  const w = where(f, areas);
  return `
  <article class="card" data-id="${f.id}" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="card-hit" type="button" aria-pressed="${s.caught}" aria-label="${esc(t.cardAria(n, s.caught))}"></button>
    <div class="card-art" data-fish-img><img src="${img(f)}" alt="" loading="lazy" decoding="async">
      <span class="stamp" aria-hidden="true">${t.stamp}</span></div>
    <div class="card-text">
      <h3 class="card-name">${esc(n)}</h3>
      <p class="card-en" lang="${altLang}">${esc(altName(f))}</p>
      <p class="card-meta">${stars(f.rarity)}<span class="len">${f.max_length_label ? esc(f.max_length_label) : t.lenUnknown}</span></p>
      <p class="card-where">${w[0]}${w.length > 1 ? ` <span class="more">+${w.length - 1}</span>` : ''}</p>
      ${isYard(f) && s.bred ? `<p class="bred-note">${t.bredNote}</p>` : ''}
    </div>
    <button class="card-glow" type="button" aria-pressed="${s.caughtGlowing}" aria-label="${t.glowAria(s.caughtGlowing)}">${GLOW_ICON}</button>
    ${isYard(f) ? `<button class="card-bred" type="button" aria-pressed="${!!s.bred}" aria-label="${t.bredAria(s.bred)}">${HOUSE_ICON}</button>` : ''}
    <button class="card-open" type="button">${t.open}<span class="visually-hidden">${esc(t.openFor(n))}</span></button>
  </article>`;
}

function renderEmpty(filters) {
  const q = filters.q.trim();
  return `<div class="empty">
    <p class="empty-title">${t.emptyTitle}</p>
    <p>${esc(q ? t.emptyQuery(q) : t.emptyFilters)} ${t.emptyTip}</p>
    <button class="ink-btn" data-filter="reset" type="button">${t.clearFilters}</button></div>`;
}

function renderDetail(f, s, { areas, img }) {
  const tm = fmtTime(f.time), se = fmtSeason(f.season);
  return `
  <article class="sheet" data-caught="${s.caught}" data-glow="${s.caughtGlowing}">
    <button class="sheet-close" type="button" data-close aria-label="${t.close}">×</button>
    <header class="sheet-head">
      <p class="sheet-rarity">${stars(f.rarity)}</p>
      <h2>${esc(name(f))}</h2>
      <p class="sheet-en" lang="${altLang}">${esc(altName(f))}</p>
    </header>
    <figure class="sheet-art">
      <div class="specimen" data-fish-img><img src="${img(f)}" alt="${esc(name(f))}"></div>
      <span class="stamp" aria-hidden="true">${t.stamp}</span>
    </figure>
    <div class="sheet-actions">
      <button class="toggle" data-toggle="caught" aria-pressed="${s.caught}" type="button"><span class="box" aria-hidden="true"></span>${t.tCaught}</button>
      <button class="toggle glow" data-toggle="caughtGlowing" aria-pressed="${s.caughtGlowing}" type="button"><span class="box" aria-hidden="true"></span>${t.tGlow}</button>
      ${isYard(f) ? `<button class="toggle bred" data-toggle="bred" aria-pressed="${!!s.bred}" type="button"><span class="box" aria-hidden="true"></span>${t.tBred}</button>` : ''}
    </div>
    <dl class="facts">
      <dt>${t.where}</dt><dd>${where(f, areas).join('<br>')}</dd>
      <dt>${t.when}</dt><dd class="${tm.unknown ? 'unknown' : ''}">${esc(tm.text)}${tm.overnight ? ` <span class="note">${t.overnight}</span>` : ''}${unsure(f, 'time')}</dd>
      <dt>${t.season}</dt><dd class="${se.unknown ? 'unknown' : ''}">${esc(se.text)}${unsure(f, 'season')}</dd>
      <dt>${t.bait}</dt><dd>${f.bait.map(b => `<span class="${baitTranslated(b) ? '' : 'untranslated'}">${esc(bait(b))}</span>`).join(', ')}${unsure(f, 'bait')}</dd>
      <dt>${t.length}</dt><dd class="${f.max_length_label ? '' : 'unknown'}">${f.max_length_label ? esc(f.max_length_label) : t.unknownF}</dd>
    </dl>
  </article>`;
}

function renderProgress({ total, caught, glow, byArea }, data, filters) {
  const complete = caught === total;
  document.getElementById('tally').innerHTML = `
    <button type="button" class="tally-btn" data-view="progress" aria-pressed="${document.body.dataset.view === 'progress'}">
      <span class="tally-item">
        <span class="tally-num">${caught}<span class="of">/${total}</span></span>
        <span class="tally-label">${t.caughtLabel} <span class="pct">${pct(caught / total * 100)}</span></span>
        ${bar(caught, total)}
      </span>
      <span class="tally-item glowing">
        <span class="tally-num">${glow}<span class="of">/${total}</span></span>
        <span class="tally-label">${t.glowLabel} <span class="pct">${pct(glow / total * 100)}</span></span>
        ${bar(glow, total)}
      </span>
      <span class="tally-link">${t.overview}</span>
    </button>
    ${complete ? `<p class="complete"><span class="stamp big" aria-hidden="true">${t.complete}</span><span class="complete-text">${t.completeText(total, glow)}</span></p>` : ''}`;
  document.body.classList.toggle('is-complete', complete);

  let html = `<li class="all"><button type="button" data-filter="area" data-value="" aria-pressed="${!filters.area}">
      <span class="area-name">${t.allAreas}</span>
      <span class="area-count">${caught}<span class="of">/${total}</span></span>${bar(caught, total)}
    </button></li>`, lastKind = '';
  for (const a of byArea) {
    if (a.kind !== lastKind) { html += `<li class="kind">${t.kinds[a.kind]}</li>`; lastKind = a.kind; }
    html += `<li><button type="button" data-filter="area" data-value="${a.id}" aria-pressed="${filters.area === a.id}" class="${a.caught === a.total ? 'done' : ''}">
      <span class="area-name">${esc(a.name)}</span>
      <span class="area-count">${a.caught}<span class="of">/${a.total}</span></span>${bar(a.caught, a.total)}
      ${a.kind === 'backyard' ? `<span class="area-bred">${t.bredNote} ${a.bred}<span class="of">/${a.total}</span></span>` : ''}
    </button></li>`;
  }
  document.getElementById('areas').innerHTML = html;
}

function renderOverview({ total, caught, glow, bred, yardTotal, byArea }) {
  const row = (label, c, g, tot, extra = '', attrs = '') => `
    <tr ${attrs}>
      <th scope="row">${label}</th>
      <td><span class="ov-num">${c}<span class="of">/${tot}</span></span>${bar(c, tot)}</td>
      <td><span class="ov-num">${g}<span class="of">/${tot}</span></span>${bar(g, tot, 'glow')}</td>
      <td>${extra}</td>
    </tr>`;
  const groups = ['area', 'tournament', 'backyard'].map(kind => `
    <tbody>
      <tr class="ov-group"><th colspan="4" scope="rowgroup">${t.kinds[kind]}</th></tr>
      ${byArea.filter(a => a.kind === kind).map(a => row(
        `<button type="button" class="ov-area" data-filter="area" data-value="${a.id}">${esc(a.name)}</button>`,
        a.caught, a.glow, a.total,
        kind === 'backyard' ? `<span class="ov-num">${a.bred}<span class="of">/${a.total}</span></span>${bar(a.bred, a.total, 'bred')}` : '',
        a.caught === a.total ? 'class="done"' : '')).join('')}
    </tbody>`).join('');
  document.getElementById('overview').innerHTML = `
    <div class="ov-head">
      <h2>${t.ovTitle}</h2>
      <button type="button" class="ghost" data-view="progress">${t.ovBack}</button>
    </div>
    <p class="ov-hint">${t.ovHint}</p>
    <table class="ov" style="--l-caught: '${t.ovCaught}'; --l-glow: '${t.ovGlow}'; --l-bred: '${t.ovBred}'">
      <thead><tr><th scope="col"><span class="visually-hidden">${t.area}</span></th><th scope="col">${t.ovCaught}</th><th scope="col">${t.ovGlow}</th><th scope="col">${t.ovBred}</th></tr></thead>
      <tbody class="ov-total">${row(t.ovTotal, caught, glow, total,
        `<span class="ov-num">${bred}<span class="of">/${yardTotal}</span></span>${bar(bred, yardTotal, 'bred')}`)}</tbody>
      ${groups}
    </table>`;
}

function renderStickers(data) {
  const f = id => data.all.find(x => x.id === id);
  const S = (caught, caughtGlowing, bred = false) => ({ caught, caughtGlowing, bred });
  const sets = [
    ['Stavy ulovení', [
      ['Neuloveno', f('arapaima'), S(false, false)],
      ['Uloveno', f('arapaima'), S(true, false)],
      ['Jen zářivá', f('arapaima'), S(false, true)],
      ['Uloveno + zářivá', f('arapaima'), S(true, true)],
      ['Backyard: nemám za domem', f('fire-eel'), S(true, false, false)],
      ['Backyard: mám za domem', f('fire-eel'), S(true, true, true)],
    ]],
    ['Interakce', [
      ['Hover', f('blue-tang'), S(false, false), 'is-hover'],
      ['Focus z klávesnice', f('blue-tang'), S(true, false), 'is-focus'],
      ['Dlouhý stisk 500 ms (mobil)', f('blue-tang'), S(true, false), 'is-pressing is-frozen'],
    ]],
    ['Hraniční data', [
      ['Nejdelší CZ jméno', f('redfin-pickerel'), S(true, false)],
      ['Nejdelší EN jméno', f('spotted-tiger-shovelnose-catfish'), S(false, false)],
      ['Bez délky, čas neznámý', f('shortdorsal-cutthroat-eel'), S(false, false)],
      ['Široký obrázek 300 px', f('golden-gar'), S(true, true)],
      ['Malý obrázek 62 px', f('banggai-cardinalfish'), S(true, false)],
      ['Ve 4 oblastech', f('common-carp'), S(true, false)],
      ['Nejistá délka (?)', f('nurse-shark'), S(false, false)],
      ['Bílé pozadí obrázku (chyba dat)', f('allis-shad'), S(true, false)],
      ['Bílé pozadí + zářivá', f('allis-shad'), S(true, true)],
    ]],
  ];
  document.getElementById('stickers').innerHTML = `
    <div class="ov-head"><h2>${t.stickers}</h2><button type="button" class="ghost" data-view="stickers">${t.ovBack}</button></div>
    ${sets.map(([title, items]) => `
      <h3 class="sticker-title">${title}</h3>
      <div class="states" inert>${items.map(([label, fish, s, cls = '']) =>
        `<figure class="state"><figcaption>${label}</figcaption>${renderCard(fish, s, data).replace('class="card"', `class="card ${cls}"`)}</figure>`).join('')}</div>`).join('')}`;
}

function renderActive(filters, n) {
  const chips = [];
  const chip = (label, filter, value = '') =>
    chips.push(`<button type="button" class="chip removable" data-filter="${filter}" data-value="${esc(value)}" aria-label="${esc(t.removeFilter(label))}">${label}<span aria-hidden="true">×</span></button>`);
  if (filters.q.trim()) chip(`„${esc(filters.q.trim())}“`, 'q');
  if (filters.area) chip(esc(areaName(window.__areas, filters.area)), 'area', '');
  for (const r of [...filters.rarity].sort()) chip(`<span class="stars r${r}">${'★'.repeat(r)}</span>`, 'rarity', String(r));
  if (filters.status !== 'all') chip({ uncaught: t.uncaught, caught: t.caught, noglow: t.noglow }[filters.status], 'status', 'all');
  for (const b of filters.bait) chip(esc(bait(b)), 'bait', b);
  if (filters.area === 'backyard' && filters.bred) chip(`${t.yard}: ${filters.bred === 'yes' ? t.yardHave : t.yardNot}`, 'bred', '');
  const el = document.getElementById('active');
  el.hidden = !chips.length;
  el.innerHTML = chips.join('') + (chips.length > 1 ? `<button type="button" class="ghost" data-filter="reset">${t.clearAll}</button>` : '');
  const active = chips.length - (filters.q.trim() ? 1 : 0);
  document.getElementById('filters-count').textContent = active ? ` (${active})` : '';
  document.getElementById('show-n').textContent = t.showN(n);
}

function renderBackup(state, s) {
  const exportBlock = `
    <section class="bk-part">
      <h3>${t.exH}</h3>
      <p>${t.exSummary(s.caught, s.glow, s.bred)}</p>
      <button type="button" class="ink-btn" data-export>${t.exBtn}</button>
      <p class="bk-file">fishdex-progress-${new Date().toISOString().slice(0, 10)}.json</p>
    </section>`;
  let importBlock;
  if (state.step === 'preview') {
    const f = state.file;
    importBlock = `
      <section class="bk-part bk-preview">
        <h3>${t.imH}</h3>
        <dl class="bk-meta"><dt>${t.imFile}</dt><dd>${esc(f.name)}</dd>${f.savedAt ? `<dt>${t.imSaved}</dt><dd>${date(f.savedAt)}</dd>` : ''}</dl>
        <p class="bk-count">${t.imFish(f.count)}</p>
        <p class="bk-break">${t.imBreak(f.caught, f.glow, f.bred)}</p>
        ${f.unknown ? `<p class="bk-warn">${t.imUnknown(f.unknown)}</p>` : ''}
        <p class="bk-how">${t.imHow}</p>
        <div class="bk-choices">
          <button type="button" class="bk-choice" data-apply="merge"><strong>${t.merge}</strong><span>${t.mergeD}</span></button>
          <button type="button" class="bk-choice danger" data-apply="replace"><strong>${t.replace}</strong><span>${t.replaceD}</span></button>
        </div>
        <button type="button" class="ghost" data-pick>${t.otherFile}</button>
      </section>`;
  } else {
    importBlock = `
      <section class="bk-part">
        <h3>${t.imH}</h3>
        ${state.step === 'error' ? `<div class="bk-error" role="alert"><p><strong>${t.imErr}</strong> ${esc(state.name)}</p><p>${t.imErrD}</p></div>` : ''}
        <button type="button" class="pick" data-pick>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4h16v-4"/></svg>
          <span><strong>${state.step === 'error' ? t.otherFile : t.imPick}</strong><span>${t.imPickHint}</span></span>
        </button>
      </section>`;
  }
  return `
    <div class="bk">
      <button class="sheet-close" type="button" data-close aria-label="${t.close}">×</button>
      <h2 id="backup-title">${t.bTitle}</h2>
      <p class="bk-lead">${t.bLead}</p>
      ${state.step === 'preview' ? importBlock : exportBlock + importBlock}
    </div>`;
}

function setup({ all, areas }) {
  window.__areas = areas;
  // static UI strings
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t[el.dataset.t]; });
  document.querySelectorAll('[data-t-ph]').forEach(el => { el.placeholder = t[el.dataset.tPh]; });
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.setAttribute('aria-pressed', String(el.dataset.lang === lang));
    const u = new URL(location.href); u.searchParams.set('lang', el.dataset.lang); el.href = u;
  });

  // bait list sorted by how many fish take it (counts from the full data set)
  const counts = {};
  for (const f of all) for (const b of f.bait) counts[b] = (counts[b] ?? 0) + 1;
  const baits = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || bait(a).localeCompare(bait(b), lang));
  document.getElementById('bait-list').innerHTML = baits.map(b => `
    <li><label class="bait-opt">
      <input type="checkbox" data-filter="bait" data-value="${esc(b)}">
      <span class="bait-name ${baitTranslated(b) ? '' : 'untranslated'}">${esc(bait(b))}</span>
      <span class="leader" aria-hidden="true"></span>
      <span class="bait-count">${counts[b]}</span>
    </label></li>`).join('');
  const btn = document.getElementById('bait-btn'), panel = document.getElementById('bait-panel');
  const setOpen = open => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-close-panel]').addEventListener('click', () => { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.bait-picker')) setOpen(false); });
  if (new URLSearchParams(location.search).get('baitpanel')) setOpen(true);
  document.getElementById('area').innerHTML = `<option value="">${t.allAreas}</option>` +
    areas.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
}

function onFilters(filters) {
  const sel = [...filters.bait];
  document.getElementById('bait-btn-value').textContent =
    sel.length === 0 ? t.baitAny : sel.length === 1 ? bait(sel[0]) : t.baitN(sel.length);
  document.getElementById('bred-row').hidden = filters.area !== 'backyard';
  const area = document.getElementById('area');
  if (area.value !== filters.area) area.value = filters.area;
}

createApp({
  t, renderCard, renderEmpty, renderDetail, renderProgress, renderOverview, renderStickers,
  renderActive, renderBackup, setup, onFilters,
  countLabel: t.count,
  toastText: (f, field, on) => t.toast(name(f), field, on),
});
