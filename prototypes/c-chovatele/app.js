// Mockup: "Chovatelé" tab. Fish come from the real data (backyard only); players are SAMPLE entries.
const params = new URLSearchParams(location.search);
const fish = await fetch('../../web/src/data/fish.json').then(r => r.json());
const backyard = fish.filter(f => f.areas.includes('backyard'))
  .sort((a, b) => a.names.cs.localeCompare(b.names.cs, 'cs'));
const byId = Object.fromEntries(backyard.map(f => [f.id, f]));
const TOTAL = backyard.length;

// ---------- sample players (deterministic) ----------
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = n => [...backyard].sort(() => rnd() - 0.5).slice(0, n).map(f => f.id);
const NOW = Date.parse('2026-11-19T15:00:00Z');
const H = 3600e3;
const sample = [
  ['KaprKrál', 61, 2], ['rybka_z_laketownu', 44, 26], ['Pstruh007', 38, 5], ['MořskáVlčice', 33, 50],
  ['Thombani_Tom', 27, 120], ['BarborkaFish', 21, 9], ['ŠtikaŠtikovská', 18, 300], ['zubáč', 14, 74],
  ['Nocturne', 11, 20], ['PalmIslandPepa', 9, 900], ['hlubinar', 6, 1400], ['Lin', 3, 33],
  ['TenNejdelšíNickVeHře', 2, 3000], ['Ondra_2010', 0, 60],
].map(([nick, n, ago], i) => ({
  id: `u${i + 1}`, no: i + 1, nick, fish: pick(n), updatedAt: NOW - ago * H,
  avatar: i % 5 === 3 ? null : `hsl(${(i * 47) % 360} 35% 55%)`, reports: 0,
}));
sample[6].reports = 2; sample[10].reports = 1;
const MY = { id: 'me', no: 15, nick: 'Weronika_Fishao', avatar: 'hsl(205 40% 50%)', reports: 0 };
const myBred = pick(12);

// ---------- helpers ----------
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const plural = (n, one, few, many) => n === 1 ? one : n >= 2 && n <= 4 ? few : many;
const ago = t => {
  const h = Math.round((NOW - t) / H);
  if (h < 1) return 'před chvílí';
  if (h < 24) return `před ${h} h`;
  const d = Math.round(h / 24);
  return d < 31 ? `před ${d} ${plural(d, 'dnem', 'dny', 'dny')}` : new Date(t).toLocaleDateString('cs');
};
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(k => k != null && k !== false));
  return e;
};
const fishImg = (id, size = 'sm') => {
  const f = byId[id];
  return f.img
    ? el('img', { class: `fi ${size}`, src: `../../web/public/fish/${id}.webp`, alt: '', loading: params.has('shot') ? 'eager' : 'lazy', width: 36, height: 36 })
    : el('span', { class: `fi ${size} none`, 'aria-hidden': 'true' }, '?');
};
const avatar = (p, big) => p.avatar
  ? el('span', { class: `av${big ? ' big' : ''}`, style: `--av:${p.avatar}`, 'aria-hidden': 'true' }, p.nick[0].toUpperCase())
  : el('span', { class: `av none${big ? ' big' : ''}`, 'aria-hidden': 'true' }, '◌');
const toast = msg => {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2500);
};

// ---------- state ----------
const state = {
  me: params.get('me') ?? 'out',
  list: params.get('list') ?? 'ok',
  admin: params.get('admin') === '1',
  q: '', bfish: params.get('bfish') ?? '', sort: 'count', expanded: new Set(),
};
for (const [id, key] of [['m-me', 'me'], ['m-list', 'list']]) {
  const s = document.getElementById(id); s.value = state[key];
  s.addEventListener('change', () => { state[key] = s.value; render(); });
}
const adminBox = document.getElementById('m-admin');
adminBox.checked = state.admin;
adminBox.addEventListener('change', () => { state.admin = adminBox.checked; render(); });

const sel = document.getElementById('bfish');
for (const f of backyard) sel.append(el('option', { value: f.id }, f.names.cs));
sel.value = state.bfish;
sel.addEventListener('change', () => { state.bfish = sel.value; render(); });
document.getElementById('q').addEventListener('input', e => { state.q = e.target.value; render(); });
for (const b of document.querySelectorAll('[data-sort]')) b.addEventListener('click', () => {
  state.sort = b.dataset.sort;
  for (const o of document.querySelectorAll('[data-sort]')) o.setAttribute('aria-pressed', String(o === b));
  render();
});
document.getElementById('privacy-link').addEventListener('click', e => {
  e.preventDefault(); const p = document.getElementById('privacy'); p.hidden = !p.hidden;
});

const published = () => ['published', 'pending', 'offline'].includes(state.me);
function players() {
  if (state.list !== 'ok') return [];
  const all = [...sample];
  if (published()) all.push({ ...MY, fish: myBred, updatedAt: NOW - 0.02 * H, mine: true });
  return all.filter(p => state.admin || p.reports < 3);
}

// ---------- register ----------
function render() {
  const all = players();
  const q = fold(state.q.trim());
  let list = all.filter(p => (!q || fold(p.nick).includes(q)) && (!state.bfish || p.fish.includes(state.bfish)));
  list.sort(state.sort === 'count' ? (a, b) => b.fish.length - a.fish.length || a.nick.localeCompare(b.nick, 'cs')
    : (a, b) => b.updatedAt - a.updatedAt);

  document.getElementById('reg-count').textContent = state.list === 'ok'
    ? `${all.length} ${plural(all.length, 'zápis', 'zápisy', 'zápisů')} · za domem jde chovat ${TOTAL} ryb` : '';

  // admin queue
  const slip = document.getElementById('admin-slip');
  const reported = all.filter(p => p.reports > 0);
  slip.hidden = !state.admin || state.list !== 'ok';
  slip.replaceChildren(el('strong', {}, 'Ke kontrole: '), reported.length
    ? `${reported.length} ${plural(reported.length, 'nahlášený zápis', 'nahlášené zápisy', 'nahlášených zápisů')}`
    : 'nic', el('span', { class: 'muted' }, ' · vidíš i skryté zápisy'));

  // fish focus line
  const focus = document.getElementById('fish-focus');
  focus.replaceChildren();
  if (state.bfish && state.list === 'ok') {
    const f = byId[state.bfish];
    const n = all.filter(p => p.fish.includes(f.id)).length;
    focus.append(el('div', { class: 'focus' }, fishImg(f.id, 'md'),
      el('p', {}, el('span', { class: 'focus-name' }, f.names.cs), ' ',
        n ? `· za domem u ${n} ${plural(n, 'hráče', 'hráčů', 'hráčů')}` : '· zatím ji nikdo nechová'),
      el('button', { class: 'linkbtn', type: 'button', onclick: () => { state.bfish = ''; sel.value = ''; render(); } }, 'Zrušit filtr')));
  }

  const ol = document.getElementById('entries');
  ol.replaceChildren();
  if (state.list === 'error') {
    ol.append(el('li', { class: 'empty' }, 'Registr se teď nepodařilo načíst. Tvůj deník tím není dotčený, zkus to za chvíli. ',
      el('button', { class: 'linkbtn', type: 'button', onclick: () => toast('Zkouším znovu…') }, 'Zkusit znovu')));
    return renderMe();
  }
  if (state.list === 'empty') {
    ol.append(el('li', { class: 'empty' }, 'Do registru se zatím nikdo nezapsal. Buď první — stačí Discord a přezdívka z Fishao.'));
    return renderMe();
  }
  if (!list.length) {
    ol.append(el('li', { class: 'empty' }, 'Takového chovatele v registru nemáme. ',
      el('button', { class: 'linkbtn', type: 'button', onclick: () => {
        state.q = ''; state.bfish = ''; document.getElementById('q').value = ''; sel.value = ''; render();
      } }, 'Zrušit filtry')));
  }
  for (const p of list) ol.append(entry(p));
  renderMe();
}

function entry(p) {
  const LIMIT = matchMedia('(max-width: 900px)').matches ? 6 : 14;
  const open = state.expanded.has(p.id);
  const shown = open ? p.fish : p.fish.slice(0, LIMIT);
  const hidden = p.reports >= 3;
  const li = el('li', { class: `entry${p.mine ? ' mine' : ''}${hidden ? ' is-hidden' : ''}` },
    el('span', { class: 'no' }, `č. ${String(p.no).padStart(3, '0')}`),
    avatar(p),
    el('div', { class: 'who' },
      el('h3', { class: 'nick' }, p.nick, p.mine && el('span', { class: 'mine-tag' }, 'tvůj zápis')),
      el('p', { class: 'meta' }, `upraveno ${ago(p.updatedAt)}`, el('span', { class: 'acts' }),
        state.admin && p.reports > 0 && el('span', { class: 'flag' }, ` · nahlášeno ${p.reports}×`))),
    el('p', { class: 'tally' }, el('b', {}, p.fish.length), el('span', {}, ` z ${TOTAL}`),
      el('span', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: `width:${(p.fish.length / TOTAL) * 100}%` }))),
  );
  const strip = el('ul', { class: 'strip', 'aria-label': `Ryby za domem: ${p.nick}` });
  if (!p.fish.length) strip.append(el('li', { class: 'none-yet' }, 'Za domem zatím nic.'));
  for (const id of shown) strip.append(el('li', { class: id === state.bfish ? 'hit' : null },
    el('button', { type: 'button', class: 'fbtn', title: byId[id].names.cs, 'aria-label': byId[id].names.cs,
      onclick: () => toast(`Otevře detail: ${byId[id].names.cs}`) }, fishImg(id))));
  if (p.fish.length > LIMIT) strip.append(el('li', {}, el('button', { type: 'button', class: 'more', 'aria-expanded': String(open),
    onclick: () => { open ? state.expanded.delete(p.id) : state.expanded.add(p.id); render(); } },
    open ? 'méně' : `+${p.fish.length - LIMIT}`)));
  li.append(strip);

  const acts = li.querySelector('.acts');
  if (state.admin) {
    acts.append(
      el('button', { type: 'button', class: 'linkbtn', onclick: () => toast(`${hidden ? 'Obnoveno' : 'Skryto'}: ${p.nick}`) }, hidden ? 'Obnovit' : 'Skrýt'),
      el('button', { type: 'button', class: 'linkbtn danger', onclick: () => toast(`Smazáno: ${p.nick}`) }, 'Smazat'),
      el('button', { type: 'button', class: 'linkbtn danger', onclick: () => toast(`Zablokováno: ${p.nick}`) }, 'Zablokovat'));
  } else if (!p.mine) {
    acts.append(el('button', { type: 'button', class: 'linkbtn faint',
      onclick: () => toast(state.me === 'out' ? 'Nahlásit může jen přihlášený hráč' : `Nahlášeno: ${p.nick}. Díky.`) }, 'Nahlásit'));
  }
  return li;
}

// ---------- my entry (aside) ----------
function renderMe() {
  const box = document.getElementById('me');
  const s = state.me;
  const h = el('h2', { id: 'me-h', class: 'me-h' }, 'Můj zápis');
  const discordBtn = el('button', { type: 'button', class: 'btn', onclick: () => toast('Přesměruje na Discord…') },
    'Přihlásit přes Discord');
  const who = el('div', { class: 'me-who' }, avatar(MY, true),
    el('div', {}, el('span', { class: 'k' }, 'Přihlášen přes Discord'),
      el('button', { type: 'button', class: 'linkbtn', onclick: () => { state.me = 'out'; sync(); } }, 'Odhlásit')));
  const nickField = (val, err) => el('label', { class: 'field wide' },
    el('span', { class: 'k' }, 'Přezdívka ve Fishao'),
    el('input', { type: 'text', value: val, maxlength: 20, placeholder: 'Jak se jmenuješ ve hře', 'aria-invalid': err ? 'true' : null,
      'aria-describedby': err ? 'nick-err' : null }),
    err && el('span', { class: 'err', id: 'nick-err' }, err));
  const preview = el('div', { class: 'preview' },
    el('p', {}, `Zveřejní se ${myBred.length} ${plural(myBred.length, 'ryba', 'ryby', 'ryb')} z tvého deníku označených „mám za domem“.`),
    el('ul', { class: 'strip mini' }, myBred.slice(0, 8).map(id => el('li', {}, fishImg(id))),
      myBred.length > 8 && el('li', { class: 'more-n' }, `+${myBred.length - 8}`)));
  const status = (cls, text) => el('p', { class: `status ${cls}` }, el('span', { class: 'dot', 'aria-hidden': 'true' }), text);
  const del = el('button', { type: 'button', class: 'linkbtn danger', onclick: () => toast('Zápis smazán ze serveru. Deník v prohlížeči zůstává.') }, 'Smazat můj zápis');

  let body;
  if (s === 'out') body = [
    el('p', { class: 'lead' }, 'Zapiš se do registru a ukaž ostatním, co chováš za domem.'),
    discordBtn,
    el('p', { class: 'fine' }, 'Z Discordu bereme jen avatar a id, ne jméno. Zobrazí se přezdívka, kterou zadáš. Chytání ryb dál funguje bez přihlášení.'),
  ];
  else if (s === 'banned') body = [who, el('p', { class: 'warnbox' }, 'Tento účet má zápis do registru zablokovaný. Deník v prohlížeči funguje dál.')];
  else if (s === 'new' || s === 'taken') body = [who,
    nickField(s === 'taken' ? 'KaprKrál' : '', s === 'taken' ? 'Tuhle přezdívku už má jiný zápis. Jsi to ty? Napiš nám.' : null),
    preview,
    el('button', { type: 'button', class: 'btn', onclick: () => { state.me = 'published'; sync(); toast('Zveřejněno. Změny za domem se teď budou odesílat samy.'); } }, 'Zveřejnit můj chov'),
    el('p', { class: 'fine' }, 'Po zveřejnění se každá změna „mám za domem“ odešle sama.')];
  else if (s === 'hidden') body = [who,
    el('p', { class: 'warnbox' }, 'Moderátor tvůj zápis skryl kvůli přezdívce. Změň ji a ulož, zápis se znovu ukáže.'),
    nickField('nevhodná_přezdívka', null),
    el('button', { type: 'button', class: 'btn', onclick: () => { state.me = 'published'; sync(); } }, 'Uložit přezdívku'), del];
  else body = [who, nickField(MY.nick, null),
    s === 'published' ? status('ok', `Odesláno ${ago(NOW - 0.02 * H)} · ${myBred.length} ryb`)
      : s === 'pending' ? status('wait', 'Odesílám 3 změny…')
        : status('bad', 'Server nedostupný. 3 změny počkají a odešlou se samy.'),
    el('button', { type: 'button', class: 'btn ghost', onclick: () => toast('Přezdívka uložena') }, 'Uložit přezdívku'),
    el('p', { class: 'fine' }, 'Ryby za domem měníš v deníku (ikonka domku v detailu ryby).'),
    del];
  box.replaceChildren(h, ...body);
  renderExcerpt();
}

function sync() { document.getElementById('m-me').value = state.me; render(); }

// ---------- fish detail excerpt ----------
function renderExcerpt() {
  const f = byId['fire-eel'] ?? backyard[0];
  const n = players().filter(p => p.fish.includes(f.id)).length;
  document.getElementById('excerpt').replaceChildren(
    el('div', { class: 'ex-row' }, fishImg(f.id, 'md'), el('span', { class: 'ex-name' }, f.names.cs)),
    el('div', { class: 'ex-row' },
      el('button', { type: 'button', class: 'house', 'aria-pressed': 'true' }, '⌂'),
      el('span', {}, 'Mám za domem')),
    el('div', { class: 'ex-row' },
      el('a', { href: `?bfish=${f.id}&me=${state.me}`, class: 'ex-link' },
        state.list === 'error' ? 'Kdo ji chová →' : n ? `${plural(n, 'Chová', 'Chovají', 'Chová')} ji ${n} ${plural(n, 'hráč', 'hráči', 'hráčů')} →` : 'Zatím ji nikdo nechová →')),
  );
}

render();
