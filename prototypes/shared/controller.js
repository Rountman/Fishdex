// Interaction layer for prototype A. The view supplies markup via render
// callbacks; this file wires state, URL and events. Every mockup screen is a
// URL: see prototypes/index.html for the list of parameters.
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

const SCHEMA_VERSION = 1;
const today = () => new Date().toISOString().slice(0, 10);

export async function createApp(view) {
  const data = await loadSample();
  const { fish } = data;
  const known = new Set(data.all.map(f => f.id));
  const yard = new Set(data.all.filter(f => f.areas.includes('backyard')).map(f => f.id));

  let progress = structuredClone(DEMO_PROGRESS);
  if (params.get('progress') === 'all') {
    progress = Object.fromEntries(data.all.map((f, i) => [f.id, { caught: true, caughtGlowing: i % 3 === 0, bred: yard.has(f.id) }]));
  }
  const filters = {
    q: params.get('q') ?? '',
    rarity: new Set(params.get('rarity')?.split(',').map(Number) ?? []),
    area: params.get('area') ?? '',
    bait: new Set(params.get('bait')?.split(',') ?? []),
    status: params.get('status') ?? 'all',
    bred: params.get('bred') ?? '',
  };
  let mode = params.get('view') ?? 'grid';
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
      if (filters.bait.size && !f.bait.some(b => filters.bait.has(b))) return false;
      // "za domem" filter only applies while the Backyard area is selected
      if (filters.area === 'backyard' && filters.bred === 'yes' && !s.bred) return false;
      if (filters.area === 'backyard' && filters.bred === 'no' && s.bred) return false;
      if (filters.status === 'caught' && !s.caught) return false;
      if (filters.status === 'uncaught' && s.caught) return false;
      if (filters.status === 'noglow' && s.caughtGlowing) return false;
      return true;
    });
  }

  function stats() {
    const on = (id, k) => known.has(id) && progress[id]?.[k];
    const ids = Object.keys(progress);
    const byArea = data.areas.map(a => ({
      ...a,
      total: data.areaTotals[a.id],
      caught: a.fish_ids.filter(id => progress[id]?.caught).length,
      glow: a.fish_ids.filter(id => progress[id]?.caughtGlowing).length,
      bred: a.fish_ids.filter(id => progress[id]?.bred).length,
    }));
    return {
      total: data.all.length,
      caught: ids.filter(id => on(id, 'caught')).length,
      glow: ids.filter(id => on(id, 'caughtGlowing')).length,
      bred: ids.filter(id => on(id, 'bred')).length,
      yardTotal: yard.size,
      byArea,
    };
  }

  function syncUrl() {
    const u = new URL(location.href);
    const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    set('q', filters.q.trim());
    set('area', filters.area);
    set('rarity', [...filters.rarity].sort().join(','));
    set('bait', [...filters.bait].join(','));
    set('status', filters.status === 'all' ? '' : filters.status);
    set('bred', filters.area === 'backyard' ? filters.bred : '');
    set('view', mode === 'grid' ? '' : mode);
    history.replaceState(null, '', u);
  }

  function render() {
    document.body.dataset.view = mode;
    const s = stats();
    view.renderProgress(s, data, filters);
    if (mode === 'progress') view.renderOverview(s, data);
    else if (mode === 'stickers') view.renderStickers(data);
    else {
      const list = visible();
      grid.innerHTML = list.length ? list.map(f => view.renderCard(f, st(f.id), data)).join('') : view.renderEmpty(filters);
      $('#result-count').textContent = view.countLabel(list.length, fish.length);
      view.renderActive(filters, list.length);
    }
    view.onFilters(filters, data);
    syncPressed();
    if (openId) $('#detail-body').innerHTML = view.renderDetail(fish.find(f => f.id === openId) ?? data.all.find(f => f.id === openId), st(openId), data);
  }
  const update = () => { render(); syncUrl(); };

  function toggle(id, field) {
    const prev = { ...st(id) };
    progress[id] = { ...prev, [field]: !prev[field] };
    undo = { id, prev };
    const f = data.all.find(x => x.id === id);
    showToast(view.toastText(f, field, progress[id][field]));
    render();
    document.querySelector(`.card[data-id="${id}"] .card-hit`)?.focus({ preventScroll: true });
  }

  function showToast(text, { sticky = false, undoable = true } = {}) {
    $('#toast-text').textContent = text;
    $('#toast-undo').hidden = !undoable;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    if (!sticky) toastTimer = setTimeout(() => ($('#toast').hidden = true), 5000);
  }
  $('#toast-undo').addEventListener('click', () => {
    if (!undo) return;
    if (undo.all) progress = undo.all; else progress[undo.id] = undo.prev;
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
      toggle(card.dataset.id, 'caughtGlowing');
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
    if (e.target.closest('.card-bred')) return toggle(id, 'bred');
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
    $('#detail-body').innerHTML = view.renderDetail(data.all.find(f => f.id === id), st(id), data);
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
  search.value = filters.q;
  search.addEventListener('input', () => { filters.q = search.value; update(); });
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    const { filter, value } = chip.dataset;
    if (filter === 'rarity') {
      const r = +value;
      filters.rarity.has(r) ? filters.rarity.delete(r) : filters.rarity.add(r);
    } else if (filter === 'bait') {
      if (value === '') filters.bait.clear();
      else filters.bait.has(value) ? filters.bait.delete(value) : filters.bait.add(value);
    } else if (filter === 'q') {
      filters.q = ''; search.value = '';
    } else if (filter === 'reset') {
      Object.assign(filters, { q: '', area: '', status: 'all', bred: '' });
      filters.rarity.clear();
      filters.bait.clear();
      search.value = '';
    } else if (filter === 'area' && mode === 'progress') {
      filters.area = value; mode = 'grid';
    } else {
      filters[filter] = filters[filter] === value && filter !== 'status' && filter !== 'bred' && filter !== 'area' ? '' : value;
    }
    update();
  });
  function syncPressed() {
    document.querySelectorAll('[data-filter]').forEach(c => {
      const f = c.dataset.filter, v = c.dataset.value;
      if (f === 'reset' || f === 'q' || c.classList.contains('removable')) return;
      const on = f === 'rarity' ? filters.rarity.has(+v)
        : f === 'bait' ? (v === '' ? !filters.bait.size : filters.bait.has(v))
        : filters[f] === v;
      if (c.type === 'checkbox') c.checked = on;
      else c.setAttribute('aria-pressed', String(on));
    });
  }
  document.querySelectorAll('select[data-select]').forEach(sel =>
    sel.addEventListener('change', () => { filters[sel.dataset.select] = sel.value; update(); }));

  // mobile filter sheet
  const sheet = $('#filters');
  const setSheet = open => {
    sheet.toggleAttribute('data-open', open);
    $('#filters-btn').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('sheet-open', open);
  };
  $('#filters-btn').addEventListener('click', () => setSheet(true));
  document.querySelectorAll('[data-close-sheet]').forEach(b => b.addEventListener('click', () => setSheet(false)));
  if (params.get('filters') === 'open') setSheet(true);

  // views
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (!v) return;
    mode = mode === v.dataset.view ? 'grid' : v.dataset.view;
    update();
    scrollTo({ top: 0 });
  });

  // --- backup dialog -----------------------------------------------------
  const backup = $('#backup');
  let pending = null;
  const renderBackup = state => { $('#backup-body').innerHTML = view.renderBackup(state, stats()); };
  const openBackup = state => { renderBackup(state); if (!backup.open) backup.showModal(); };
  document.addEventListener('click', e => { if (e.target.closest('[data-open-backup]')) openBackup({ step: 'start' }); });
  backup.addEventListener('click', e => {
    if (e.target === backup || e.target.closest('[data-close]')) return backup.close();
    if (e.target.closest('[data-export]')) return download();
    if (e.target.closest('[data-pick]')) return $('#import-file').click();
    const how = e.target.closest('[data-apply]')?.dataset.apply;
    if (how && pending) applyImport(how);
  });
  $('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      pending = inspect(JSON.parse(await file.text()), file.name);
      renderBackup({ step: 'preview', file: pending });
    } catch {
      pending = null;
      renderBackup({ step: 'error', name: file.name });
    }
  });

  function snapshot() {
    const out = {};
    for (const [id, s] of Object.entries(progress)) if (s.caught || s.caughtGlowing || s.bred) out[id] = s;
    return { version: SCHEMA_VERSION, updatedAt: new Date().toISOString(), fish: out };
  }
  function download() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `fishdex-progress-${today()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function inspect(json, name) {
    if (!json || typeof json !== 'object' || json.version !== SCHEMA_VERSION || typeof json.fish !== 'object' || json.fish === null) throw new Error('shape');
    const entries = Object.entries(json.fish).filter(([, s]) => s && typeof s === 'object');
    const n = k => entries.filter(([, s]) => s[k] === true).length;
    return {
      name, savedAt: json.updatedAt ? new Date(json.updatedAt) : null, fish: Object.fromEntries(entries),
      count: entries.length, caught: n('caught'), glow: n('caughtGlowing'), bred: n('bred'),
      unknown: entries.filter(([id]) => !known.has(id)).length,
    };
  }
  function applyImport(how) {
    undo = { all: structuredClone(progress) };
    if (how === 'replace') progress = structuredClone(pending.fish);
    else for (const [id, s] of Object.entries(pending.fish)) {
      const cur = progress[id] ?? {};
      progress[id] = {
        caught: !!(cur.caught || s.caught), caughtGlowing: !!(cur.caughtGlowing || s.caughtGlowing),
        ...(yard.has(id) || cur.bred || s.bred ? { bred: !!(cur.bred || s.bred) } : {}),
      };
    }
    backup.close();
    showToast(how === 'replace' ? view.t.replaced(pending.count) : view.t.merged(pending.count));
    pending = null;
    render();
  }
  // a fake backup for the "preview" mockup: 42 real fish ids from the data
  function mockFile() {
    const fishMap = {};
    data.all.slice(0, 42).forEach((f, i) => {
      fishMap[f.id] = { caught: true, caughtGlowing: i % 5 === 0, ...(yard.has(f.id) ? { bred: i % 2 === 0 } : {}) };
    });
    return inspect({ version: 1, updatedAt: '2026-10-12T18:40:00Z', fish: fishMap }, 'fishdex-progress-2026-10-12.json');
  }

  // --- misc --------------------------------------------------------------
  document.querySelectorAll('[data-hint-close]').forEach(b => b.addEventListener('click', () => ($('#hint').hidden = true)));
  $('#theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
  });

  view.setup(data, filters);
  render();

  // mockup states
  if (params.get('storage') === 'off') $('#storage-note').hidden = false;
  if (params.get('demo')) {
    $('#hint').hidden = false;
    const ara = data.all.find(f => f.id === 'arapaima');
    showToast(view.toastText(ara, 'caughtGlowing', true), { sticky: true });
    undo = { id: 'arapaima', prev: { caught: true, caughtGlowing: false } };
  }
  const dlg = params.get('dialog');
  if (dlg === 'backup') openBackup({ step: 'start' });
  if (dlg === 'import-preview') { pending = mockFile(); openBackup({ step: 'preview', file: pending }); }
  if (dlg === 'import-error') openBackup({ step: 'error', name: 'moje-ryby.json' });
  if (params.get('fish')) openDetail(params.get('fish'));
  return { data, progress, render };
}
