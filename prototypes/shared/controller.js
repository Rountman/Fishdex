// Shared interaction layer for both prototypes. Each prototype supplies its own
// markup via render callbacks; this file only wires state and events.
import { loadSample, DEMO_PROGRESS, matches } from './data.js';

const params = new URLSearchParams(location.search);
if (params.get('theme')) document.documentElement.dataset.theme = params.get('theme');

// cap every fish image at 2× its natural size (sources are ~120 px)
document.addEventListener('load', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('[data-fish-img]')) return;
  img.style.maxWidth = `${img.naturalWidth * 2}px`;
  img.style.maxHeight = `${img.naturalHeight * 2}px`;
}, true);

export async function createApp(view) {
  const data = await loadSample();
  const { fish } = data;
  const progress = structuredClone(DEMO_PROGRESS);
  const filters = { q: params.get('q') ?? '', rarity: new Set(), area: '', bait: '', status: 'all' };
  let undo = null, toastTimer = 0;

  const $ = s => document.querySelector(s);
  const grid = $('#grid');
  const st = id => progress[id] ?? { caught: false, caughtGlowing: false };

  function visible() {
    return fish.filter(f => {
      const s = st(f.id);
      if (!matches(f, filters.q)) return false;
      if (filters.rarity.size && !filters.rarity.has(f.rarity)) return false;
      if (filters.area && !f.areas.includes(filters.area)) return false;
      if (filters.bait && !f.bait.includes(filters.bait)) return false;
      if (filters.status === 'caught' && !s.caught) return false;
      if (filters.status === 'uncaught' && s.caught) return false;
      if (filters.status === 'noglow' && s.caughtGlowing) return false;
      return true;
    });
  }

  function stats() {
    const caught = Object.values(progress).filter(p => p.caught).length;
    const glow = Object.values(progress).filter(p => p.caughtGlowing).length;
    const byArea = data.areas.map(a => ({
      ...a,
      total: data.areaTotals[a.id],
      caught: a.fish_ids.filter(id => progress[id]?.caught).length,
      glow: a.fish_ids.filter(id => progress[id]?.caughtGlowing).length,
    }));
    return { total: data.all.length, caught, glow, byArea };
  }

  function render() {
    const list = visible();
    grid.innerHTML = list.length ? list.map(f => view.renderCard(f, st(f.id), data)).join('') : view.renderEmpty(filters);
    view.renderProgress?.(stats(), data);
    const count = $('#result-count');
    if (count) count.textContent = view.countLabel ? view.countLabel(list.length, fish.length) : `${list.length}`;
    if (openId) $('#detail-body').innerHTML = view.renderDetail(fish.find(f => f.id === openId), st(openId), data);
  }

  function toggle(id, field) {
    const prev = { ...st(id) };
    const next = { ...prev, [field]: !prev[field] };
    progress[id] = next;
    undo = { id, prev };
    const f = fish.find(x => x.id === id);
    showToast(view.toastText(f, field, next[field]));
    render();
    document.querySelector(`.card[data-id="${id}"] .card-hit`)?.focus({ preventScroll: true });
  }

  function showToast(text, sticky = false) {
    $('#toast-text').textContent = text;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(() => ($('#toast').hidden = true), 5000);
  }

  $('#toast-undo')?.addEventListener('click', () => {
    if (!undo) return;
    progress[undo.id] = undo.prev;
    undo = null;
    $('#toast').hidden = true;
    render();
  });

  // --- card events -------------------------------------------------------
  let pressTimer = 0, longPressed = false;
  grid.addEventListener('pointerdown', e => {
    const hit = e.target.closest('.card-hit');
    if (!hit || e.pointerType === 'mouse') return;
    longPressed = false;
    const card = hit.closest('.card');
    card.classList.add('is-pressing');
    pressTimer = setTimeout(() => {
      card.classList.remove('is-pressing');
      longPressed = true;
      navigator.vibrate?.(15);
      toggle(hit.closest('.card').dataset.id, 'caughtGlowing');
    }, 500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => grid.addEventListener(t, () => {
    clearTimeout(pressTimer);
    grid.querySelector('.is-pressing')?.classList.remove('is-pressing');
  }));
  grid.addEventListener('contextmenu', e => { if (e.target.closest('.card-hit')) e.preventDefault(); });

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('.card-open')) return openDetail(id);
    if (e.target.closest('.card-glow')) return toggle(id, 'caughtGlowing');
    if (e.target.closest('.card-hit')) {
      if (longPressed) { longPressed = false; return; }
      toggle(id, e.shiftKey ? 'caughtGlowing' : 'caught');
    }
  });
  grid.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.shiftKey && e.target.closest('.card-hit')) {
      e.preventDefault();
      toggle(e.target.closest('.card').dataset.id, 'caughtGlowing');
    }
  });

  // --- detail ------------------------------------------------------------
  let openId = null;
  const dialog = $('#detail');
  function openDetail(id) {
    openId = id;
    $('#detail-body').innerHTML = view.renderDetail(fish.find(f => f.id === id), st(id), data);
    if (!dialog.open) dialog.showModal();
    const u = new URL(location.href); u.searchParams.set('fish', id); history.replaceState(null, '', u);
  }
  dialog.addEventListener('close', () => {
    openId = null;
    const u = new URL(location.href); u.searchParams.delete('fish'); history.replaceState(null, '', u);
  });
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    const t = e.target.closest('[data-toggle]');
    if (t) toggle(openId, t.dataset.toggle);
  });

  // --- filters -----------------------------------------------------------
  const search = $('#search');
  if (search) {
    search.value = filters.q;
    search.addEventListener('input', () => { filters.q = search.value; render(); });
  }
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    const { filter, value } = chip.dataset;
    if (filter === 'rarity') {
      const r = +value;
      filters.rarity.has(r) ? filters.rarity.delete(r) : filters.rarity.add(r);
    } else if (filter === 'reset') {
      Object.assign(filters, { q: '', area: '', bait: '', status: 'all' });
      filters.rarity.clear();
      if (search) search.value = '';
    } else {
      filters[filter] = filters[filter] === value && filter !== 'status' ? '' : value;
    }
    document.querySelectorAll('[data-filter]').forEach(c => {
      const f = c.dataset.filter, v = c.dataset.value;
      if (f === 'reset') return;
      const on = f === 'rarity' ? filters.rarity.has(+v) : filters[f] === v;
      c.setAttribute('aria-pressed', String(on));
    });
    render();
  });
  document.querySelectorAll('select[data-select]').forEach(sel =>
    sel.addEventListener('change', () => { filters[sel.dataset.select] = sel.value; render(); }));

  document.querySelectorAll('[data-hint-close]').forEach(b =>
    b.addEventListener('click', () => ($('#hint').hidden = true)));
  $('#theme-toggle')?.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
  });

  view.setup?.(data, filters);
  render();
  renderStates();

  // static showcase of every card state (no events)
  function renderStates() {
    const strip = $('#states');
    if (!strip) return;
    const long = fish.find(f => f.id === 'spotted-tiger-shovelnose-catfish');
    const ara = fish.find(f => f.id === 'arapaima');
    const S = (caught, caughtGlowing) => ({ caught, caughtGlowing });
    const states = [
      ['Neuloveno', ara, S(false, false)],
      ['Uloveno', ara, S(true, false)],
      ['Jen zářivá', ara, S(false, true)],
      ['Obojí', ara, S(true, true)],
      ['Hover', long, S(false, false), 'is-hover'],
      ['Focus (klávesnice)', long, S(true, false), 'is-focus'],
      ['Dlouhý stisk 500 ms', long, S(true, false), 'is-pressing is-frozen'],
    ];
    strip.innerHTML = states.map(([label, f, s, cls = '']) =>
      `<figure class="state"><figcaption>${label}</figcaption>${view.renderCard(f, s, data).replace('class="card"', `class="card ${cls}"`)}</figure>`).join('');
    strip.inert = true;
  }

  // demo states for screenshots
  if (params.get('demo')) {
    $('#hint').hidden = false;
    showToast(view.toastText(fish.find(f => f.id === 'arapaima'), 'caughtGlowing', true), true);
    undo = { id: 'arapaima', prev: { caught: true, caughtGlowing: false } };
  }
  if (params.get('fish')) openDetail(params.get('fish'));
  return { data, progress, render };
}
