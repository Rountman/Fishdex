// Mockup: compare my journal with another player's. Real fish and areas, SAMPLE players.
const params = new URLSearchParams(location.search);
const [fish, areas] = await Promise.all(['fish', 'areas'].map(n => fetch(`../../web/src/data/${n}.json`).then(r => r.json())));
const AREAS = areas.filter(a => a.count > 0);
const areaName = Object.fromEntries(AREAS.map(a => [a.id, a.name]));
const isYard = f => f.areas.includes('backyard');
const isMobile = () => matchMedia('(max-width: 760px)').matches;

// ---------- sample journals (deterministic; common fish are caught more often) ----------
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function journal(seed, level, yard) {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) r();
  const fav = Object.fromEntries(AREAS.map(a => [a.id, 0.55 + r() * 0.9]));
  const j = { caught: new Set(), glow: new Set(), bred: new Set() };
  for (const f of fish) {
    const p = level * (1.25 - (f.rarity ?? 3) * 0.16) * Math.max(...f.areas.map(a => fav[a] ?? 1), 0);
    if (r() < p) { j.caught.add(f.id); if (f.glowing && r() < 0.16) j.glow.add(f.id); }
    if (isYard(f) && r() < yard) j.bred.add(f.id);
  }
  return j;
}
const HUE = [205, 152, 28, 320, 95, 250, 10];
// [nick, level, yard, catches published?]
const PLAYERS = [
  ['KaprKrál', 0.52, 0.7, true], ['rybka_z_laketownu', 0.34, 0.5, true], ['Pstruh007', 0.66, 0.4, true],
  ['MořskáVlčice', 0.4, 0.38, false], ['Thombani_Tom', 0.2, 0.3, true], ['TenNejdelšíNickVeHře', 0.9, 0.2, true],
  ['zubáč', 0.1, 0.12, false],
].map(([nick, level, yard, open], i) => ({ no: i + 1, nick, open, j: journal(101 + i * 977, level, yard), av: `hsl(${HUE[i]} 35% 38%)` }));
const ME = { nick: 'Ty', av: 'hsl(205 40% 35%)' };
const MINE = journal(4242, 0.43, 0.3);
const EMPTY = { caught: new Set(), glow: new Set(), bred: new Set() };

const WHAT = {
  caught: { label: 'Ulovené', of: () => true },
  glow: { label: 'Zářivé', of: f => f.glowing },
  bred: { label: 'Za domem', of: isYard },
};
const state = {
  vs: Number(params.get('vs')) || null,
  what: params.get('what') in WHAT ? params.get('what') : 'caught',
  area: params.get('area') ?? '', me: params.get('me') ?? 'some', page: 'theirs', share: false,
};

// ---------- helpers ----------
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(k => k != null && k !== false));
  return e;
};
const toast = m => {
  const t = document.getElementById('toast');
  t.textContent = m; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2500);
};
const avatar = (p, big) => el('span', { class: `av${big ? ' big' : ''}`, style: `--av:${p.av}`, 'aria-hidden': 'true' }, p.nick[0].toUpperCase());
const img = f => el('img', { src: `../../web/public/fish/${f.id}.webp`, alt: '', width: 56, height: 56, loading: 'lazy' });
function set(patch) {
  Object.assign(state, patch);
  const q = new URLSearchParams();
  if (state.vs) {
    q.set('vs', state.vs);
    if (state.what !== 'caught') q.set('what', state.what);
    if (state.area) q.set('area', state.area);
  }
  if (state.me !== 'some') q.set('me', state.me);
  history.replaceState(null, '', `?${q}`);
  render();
}

// ---------- players ----------
function list() {
  const rows = [...PLAYERS].sort((a, b) => (b.open ? b.j.caught.size : -1) - (a.open ? a.j.caught.size : -1));
  const row = p => el('li', {},
    el('a', {
      class: 'entry', href: `?vs=${p.no}`,
      onclick: e => { e.preventDefault(); set({ vs: p.no, what: p.open ? 'caught' : 'bred', area: '' }); scrollTo(0, 0); },
    },
    avatar(p),
    el('span', { class: 'who' }, el('span', { class: 'nick' }, p.nick),
      el('span', { class: 'meta' }, p.open ? `${p.j.glow.size} zářivých · ${p.j.bred.size} za domem` : `${p.j.bred.size} za domem · úlovky nezveřejněné`)),
    el('span', { class: 'n' }, p.open ? [el('b', {}, p.j.caught.size), el('small', {}, ` z ${fish.length}`)] : el('small', {}, '—')),
    el('span', { class: 'go' }, 'Porovnat →')));
  return el('div', { class: 'layout' },
    el('section', { 'aria-labelledby': 'h' }, el('h2', { id: 'h', class: 'h2' }, 'Hráči'), el('ol', { class: 'entries' }, rows.map(row))),
    el('aside', { class: 'slip' },
      el('h2', { class: 'h3' }, 'Můj zápis'),
      el('p', { class: 'fine' }, 'Přihlášení a přezdívka zůstávají, jak jsou.'),
      el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: true, disabled: true }),
        el('span', {}, 'Chov za domem', el('small', {}, 'zveřejněno jako dosud'))),
      el('label', { class: 'check' }, el('input', {
        type: 'checkbox', checked: state.share,
        onchange: e => { state.share = e.target.checked; toast(state.share ? 'Úlovky se budou zveřejňovat samy.' : 'Úlovky smazány ze serveru.'); },
      }), el('span', {}, 'Ulovené a zářivé ryby', el('small', {}, 'ostatní se s tebou budou moct porovnat'))),
      el('p', { class: 'fine' }, 'Porovnávat se můžeš i bez přihlášení: tvoje úlovky zůstávají v prohlížeči, stahuje se jen deník druhého hráče.')));
}

// ---------- comparison ----------
function split(p, pool) {
  const mine = (state.me === 'none' ? EMPTY : MINE)[state.what];
  const theirs = p.j[state.what];
  const s = { mine: [], theirs: [], both: [], none: [] };
  for (const f of pool) s[mine.has(f.id) ? (theirs.has(f.id) ? 'both' : 'mine') : theirs.has(f.id) ? 'theirs' : 'none'].push(f);
  for (const l of Object.values(s)) l.sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || a.names.cs.localeCompare(b.names.cs, 'cs'));
  return { ...s, me: s.mine.length + s.both.length, them: s.theirs.length + s.both.length, total: pool.length };
}
const tile = (f, missing) => el('li', {},
  el('button', { type: 'button', class: 'tile', 'data-missing': String(missing), onclick: () => toast(`Otevře detail: ${f.names.cs}`) },
    img(f), el('span', { class: 'tn' }, f.names.cs),
    el('span', { class: 'tm' },
      el('span', { class: `stars r${f.rarity}`, 'aria-label': f.rarity ? `rarita ${f.rarity} z 5` : null }, '★'.repeat(f.rarity ?? 0)),
      ` ${areaName[f.areas[0]] ?? f.areas[0] ?? ''}${f.areas.length > 1 ? ` +${f.areas.length - 1}` : ''}`)));
const LIMIT = 12;
const opened = new Set();
function tiles(key, items, missing, empty) {
  if (!items.length) return [el('p', { class: 'empty' }, empty)];
  const all = opened.has(key);
  return [
    el('ul', { class: 'tiles' }, (all ? items : items.slice(0, LIMIT)).map(f => tile(f, missing))),
    items.length > LIMIT && el('button', {
      type: 'button', class: 'more', 'aria-expanded': String(all),
      onclick: () => { if (all) opened.delete(key); else opened.add(key); render(); },
    }, all ? 'Ukázat méně' : `Ukázat všech ${items.length}`),
  ];
}

function duel(p) {
  const bred = state.what === 'bred';
  const base = fish.filter(WHAT[state.what].of);
  const all = split(p, base);
  const s = state.area ? split(p, base.filter(f => f.areas.includes(state.area))) : all;
  const scores = AREAS.map(a => ({ a, s: split(p, base.filter(f => f.areas.includes(a.id))) })).filter(x => x.s.total);
  const lead = s.me - s.them;
  const locked = !p.open && !bred;

  const back = el('a', { class: 'back', href: '?', onclick: e => { e.preventDefault(); set({ vs: null, area: '' }); } }, '← Všichni hráči');
  const head = el('header', { class: 'duel' },
    el('div', { class: 'side' }, avatar(ME, true), el('div', {}, el('span', { class: 'dn' }, 'Ty'), el('b', { class: 'score' }, s.me))),
    el('div', { class: 'mid' }, el('span', { class: 'vs' }, 'proti'),
      !locked && el('span', { class: 'lead' }, lead === 0 ? 'nerozhodně' : lead > 0 ? `vedeš o ${lead}` : `ztrácíš ${-lead}`)),
    el('div', { class: 'side right' }, el('div', {}, el('h2', { class: 'dn' }, p.nick), el('b', { class: 'score' }, locked ? '?' : s.them)), avatar(p, true)));
  const seg = el('div', { class: 'bar-row' }, el('div', { class: 'seg', role: 'group', 'aria-label': 'Co porovnat' },
    Object.entries(WHAT).map(([k, v]) => el('button', {
      type: 'button', 'aria-pressed': String(state.what === k), onclick: () => set({ what: k, area: k === 'bred' ? '' : state.area }),
    }, v.label))));
  if (locked) {
    return el('div', {}, back, head, seg, el('p', { class: 'empty big' }, `${p.nick} zatím úlovky nezveřejňuje, jen chov za domem. `,
      el('button', { type: 'button', class: 'linkbtn', onclick: () => set({ what: 'bred', area: '' }) }, 'Porovnat chov za domem')));
  }

  const parts = [['mine', 'jen ty'], ['both', 'oba'], ['theirs', `jen ${p.nick}`], ['none', 'nikdo']].map(([k, l]) => [k, s[k].length, l]);
  const tug = el('div', { class: 'tug' },
    el('div', { class: 'tugbar', 'aria-hidden': 'true' }, parts.map(([k, n]) => n > 0 && el('i', { class: k, style: `flex-grow:${n}` }))),
    el('ul', { class: 'legend' }, parts.map(([k, n, l]) => el('li', {}, el('i', { class: k, 'aria-hidden': 'true' }), el('b', {}, n), ` ${l}`))));

  const won = scores.filter(x => x.s.me > x.s.them).length;
  const lost = scores.filter(x => x.s.me < x.s.them).length;
  const areaRow = ({ a, s: x }) => el('li', {},
    el('button', { type: 'button', 'aria-pressed': String(state.area === a.id), onclick: () => set({ area: a.id }) },
      el('span', { class: 'an' }, a.name),
      el('span', { class: 'as' }, el(x.me > x.them ? 'b' : 'span', {}, x.me), ' : ', el(x.them > x.me ? 'b' : 'span', {}, x.them)),
      el('span', { class: 'pull', 'aria-hidden': 'true' },
        el('i', { class: 'l', style: `width:${x.me / x.total * 50}%` }), el('i', { class: 'r', style: `width:${x.them / x.total * 50}%` }))));
  // backyard is a single area: no index
  const index = !bred && el('nav', { class: 'index', 'aria-labelledby': 'ix' },
    el('h3', { id: 'ix' }, 'Po oblastech'),
    el('p', { class: 'fine' }, `Vedeš v ${won}, ${p.nick} v ${lost}, nerozhodně ${scores.length - won - lost}.`),
    el('ul', {}, [{ a: { id: '', name: 'Všechny oblasti' }, s: all }, ...scores].map(areaRow)));
  const areaSel = !bred && el('select', { class: 'areasel', 'aria-label': 'Oblast', onchange: e => set({ area: e.target.value }) },
    el('option', { value: '' }, `Všechny oblasti (${all.me} : ${all.them})`),
    scores.map(({ a, s: x }) => el('option', { value: a.id, selected: state.area === a.id }, `${a.name} (${x.me} : ${x.them})`)));

  // phone: one list at a time, the four numbers are the switch
  const pick = el('div', { class: 'pick', role: 'group', 'aria-label': 'Které ryby ukázat' },
    [['theirs', `Jen ${p.nick}`], ['mine', 'Jen ty'], ['both', 'Oba'], ['none', 'Nikdo']].map(([k, l]) =>
      el('button', { type: 'button', 'aria-pressed': String(state.page === k), onclick: () => set({ page: k }) },
        el('i', { class: k, 'aria-hidden': 'true' }), el('span', {}, l), el('b', {}, s[k].length))));
  const leaf = (k, title, missing, empty) => el('section', { class: `leaf ${k}`, 'data-on': String(state.page === k) },
    el('h3', {}, `${title} `, el('span', {}, s[k].length)), tiles(k, s[k], missing, empty));
  const book = el('div', { class: 'book' },
    leaf('mine', bred ? 'Chováš jen ty' : 'Máš jen ty', false, 'Nic, co by druhý deník neměl.'),
    leaf('theirs', `${bred ? 'Chová' : 'Má'} jen ${p.nick}`, true, 'Nic ti tu nechybí.'));
  const fold = (k, label, missing) => el('details', {
    class: 'fold', 'data-on': String(state.page === k), open: isMobile() || opened.has(`d-${k}`),
    ontoggle: e => { if (e.target.open) opened.add(`d-${k}`); else opened.delete(`d-${k}`); },
  }, el('summary', {}, `${label} `, el('span', {}, s[k].length)), tiles(k, s[k], missing, 'Žádná ryba.'));

  return el('div', {}, back, head, seg, tug,
    state.me === 'none' && el('p', { class: 'empty' }, 'Tvůj deník je prázdný. Odškrtej si ryby v záložce Ryby, nebo nahraj zálohu.'),
    el('div', { class: `spread${bred ? ' spread--wide' : ''}` }, index, el('div', { class: 'content' }, areaSel, pick, book,
      fold('both', bred ? 'Chováte oba' : 'Máte oba', false), fold('none', bred ? 'Nechová nikdo z vás' : 'Nemá nikdo z vás', true))));
}

function render() {
  const p = PLAYERS.find(x => x.no === state.vs);
  document.getElementById('main').replaceChildren(p ? duel(p) : list());
}
const setTheme = v => { document.documentElement.dataset.theme = v; };
for (const [id, fn, val] of [['m-me', v => set({ me: v }), state.me], ['m-theme', setTheme, params.get('theme') ?? 'light']]) {
  const s = document.getElementById(id);
  s.value = val;
  s.addEventListener('change', () => fn(s.value));
}
setTheme(params.get('theme') ?? 'light');
render();
