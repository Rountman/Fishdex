// Mockup: "Aktuální" tab. Everything is computed from the existing data — game times are UTC.
const params = new URLSearchParams(location.search);
const fixedNow = params.get('now') ? new Date(params.get('now')) : null;
const nowDate = () => fixedNow ?? new Date();

const [fish, areas] = await Promise.all([
  fetch('../../web/src/data/fish.json').then(r => r.json()),
  fetch('../../web/src/data/areas.json').then(r => r.json()),
]);
const areaName = Object.fromEntries(areas.map(a => [a.id, a.name]));

// ---------- settings (would be fishdex:settings:v1 in the app) ----------
const tzSel = document.getElementById('tz');
try { tzSel.value = JSON.parse(localStorage.getItem('fishdex:settings:v1'))?.tz ?? 'Europe/Prague'; } catch { /* default */ }
if (params.get('tz')) tzSel.value = params.get('tz');
const tz = () => tzSel.value === 'device' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tzSel.value;

let caught = {};
try { caught = JSON.parse(localStorage.getItem('fishdex:progress:v2'))?.fish ?? {}; } catch { /* none */ }

for (const a of areas.filter(a => a.kind === 'area')) {
  const o = document.createElement('option'); o.value = a.id; o.textContent = a.name;
  document.getElementById('area').append(o);
}

// ---------- time helpers ----------
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const inWin = (m, w) => {
  const f = toMin(w.from), t = toMin(w.to) || 1440;
  return f < t ? m >= f && m < t : m >= f || m < t;
};
const inTime = (m, sched) => sched.some(w => inWin(((m % 1440) + 1440) % 1440, w));
const mmdd = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const inSeason = (d, sched) => sched === 'always' || sched.some(r =>
  r.from <= r.to ? mmdd(d) >= r.from && mmdd(d) <= r.to : mmdd(d) >= r.from || mmdd(d) <= r.to);
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

function tzOffsetMin(date, zone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(date).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - date.getTime()) / 60000 / 15) * 15;
}
const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const dur = m => m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
const days = n => `${n} ${n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní'}`;
const dayDate = d => `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`;
const zoneLabel = () => tzSel.selectedOptions[0].textContent;

// ---------- classification ----------
function classify(now) {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const out = { now: [], soon: [], ending: [], next: [] };
  for (const f of fish) {
    const timed = Array.isArray(f.time), seasonal = Array.isArray(f.season);
    const inS = f.season !== null && inSeason(today, f.season);
    if (timed && inS) {
      if (inTime(m, f.time)) {
        let left = 0; while (left < 1440 && inTime(m + left, f.time)) left++;
        out.now.push({ f, sort: left, left });
      } else {
        let wait = 0; while (wait < 1440 && !inTime(m + wait, f.time)) wait++;
        if (wait < 1440) out.soon.push({ f, sort: wait, wait });
      }
    }
    if (seasonal) {
      if (inS) {
        let n = 0; while (n < 366 && inSeason(addDays(today, n + 1), f.season)) n++;
        out.ending.push({ f, sort: n, last: addDays(today, n), n: n + 1 });
      } else {
        let n = 0; while (n < 366 && !inSeason(addDays(today, n), f.season)) n++;
        out.next.push({ f, sort: n, first: addDays(today, n), n });
      }
    }
  }
  for (const k in out) out[k].sort((a, b) => a.sort - b.sort || a.f.names.cs.localeCompare(b.f.names.cs, 'cs'));
  return out;
}

// ---------- rendering ----------
const tpl = document.getElementById('row');
const SECTIONS = {
  now:    { title: 'Teď berou',     note: 'Okno je otevřené. Řazeno podle toho, komu zbývá nejmíň času.' },
  soon:   { title: 'Brzy začnou',   note: 'Otevře se během příštích 24 hodin.' },
  ending: { title: 'Sezóna končí',  note: 'Je v sezóně. Nahoře ryby, kterým sezóna končí nejdřív.' },
  next:   { title: 'Sezóna začne',  note: 'Teď mimo sezónu. Kdy se vrátí.' },
};

function dayStrip(f, nowM, off) {
  const el = document.createElement('span'); el.className = 'strip day';
  for (let h = 0; h < 24; h++) {
    const s = document.createElement('i');
    if (inTime(h * 60 - off + 30, f.time)) s.className = 'on';
    el.append(s);
  }
  const mark = document.createElement('b'); mark.style.left = `${(((nowM + off) % 1440 + 1440) % 1440) / 14.4}%`;
  el.append(mark);
  return el;
}
function yearStrip(f, today) {
  const el = document.createElement('span'); el.className = 'strip year';
  'LÚBDKČČSZŘLP'.split('').forEach((ch, i) => {
    const s = document.createElement('i'); s.textContent = ch;
    if (inSeason(new Date(Date.UTC(2026, i, 15)), f.season)) s.className = 'on';
    if (i === today.getUTCMonth()) s.classList.add('cur');
    el.append(s);
  });
  return el;
}

function render() {
  const now = nowDate(), zone = tz(), off = tzOffsetMin(now, zone);
  const nowM = now.getUTCHours() * 60 + now.getUTCMinutes();
  document.getElementById('game-time').textContent = hhmm(nowM);
  document.getElementById('local-time').textContent = hhmm(nowM + off);
  document.getElementById('local-zone').textContent = zone === 'UTC' ? 'UTC' : `${zoneLabel().split(' (')[0]} · UTC${off >= 0 ? '+' : '−'}${dur(Math.abs(off)).replace(' min', '').replace(' h', '')}`;
  document.getElementById('dial-now').style.left = `${nowM / 14.4}%`;
  document.querySelector('.clock-local').hidden = zone === 'UTC';

  const area = document.getElementById('area').value;
  const hide = document.getElementById('hide-caught').checked;
  const data = classify(now);
  const local = (w) => `${hhmm(toMin(w.from) + off)}–${hhmm(toMin(w.to) + off)}`;

  for (const [key, list] of Object.entries(data)) {
    const sec = document.getElementById(key);
    const rows = list.filter(({ f }) => (!area || f.areas.includes(area)) && !(hide && caught[f.id]?.caught));
    sec.innerHTML = `<header><h3>${SECTIONS[key].title} <span class="count">${rows.length}</span></h3>
      <p class="note">${SECTIONS[key].note}</p></header>`;
    if (!rows.length) {
      sec.insertAdjacentHTML('beforeend', `<p class="empty">Nic. ${hide ? 'Všechno odsud už máš v deníku.' : 'V téhle oblasti teď nic takového.'}</p>`);
      continue;
    }
    const ul = document.createElement('ul'); ul.className = 'rows';
    const limit = expanded.has(key) ? Infinity : LIMIT[key];
    for (const r of rows.slice(0, limit)) {
      const { f } = r;
      const li = tpl.content.firstElementChild.cloneNode(true);
      const img = li.querySelector('img');
      img.src = `../../web/public/fish/${f.id}.webp`;
      img.onerror = () => img.replaceWith(Object.assign(document.createElement('span'), { className: 'fish none', textContent: '?' }));
      li.querySelector('.name').textContent = f.names.cs;
      const where = f.areas.map(a => areaName[a] ?? a).join(', ');
      li.querySelector('.meta').innerHTML =
        `<span class="stars r${f.rarity}" aria-label="rarita ${f.rarity} z 5">${'★'.repeat(f.rarity ?? 0)}</span> ${where}`;
      const big = li.querySelector('.big'), small = li.querySelector('.small');
      const unc = (fld) => f.uncertain.includes(fld) ? ' <abbr class="unc" title="Zdroje se neshodují">?</abbr>' : '';
      if (key === 'now') { big.textContent = `zbývá ${dur(r.left)}`; small.innerHTML = f.time.map(local).join(', ') + unc('time'); }
      if (key === 'soon') { big.textContent = `za ${dur(r.wait)}`; small.innerHTML = `od ${hhmm(nowM + r.wait + off)}` + unc('time'); }
      if (key === 'ending') { big.textContent = `ještě ${days(r.n)}`; small.innerHTML = `poslední den ${dayDate(r.last)}` + unc('season'); }
      if (key === 'next') { big.textContent = `za ${days(r.n)}`; small.innerHTML = `od ${dayDate(r.first)}` + unc('season'); }
      if (key === 'now' && r.left <= 60) li.classList.add('urgent');
      if (key === 'ending' && r.n <= 7) li.classList.add('urgent');
      if (caught[f.id]?.caught) li.classList.add('caught');
      li.querySelector('.strip').replaceWith(key === 'now' || key === 'soon' ? dayStrip(f, nowM, off) : yearStrip(f, now));
      ul.append(li);
    }
    sec.append(ul);
    if (rows.length > limit) {
      const b = Object.assign(document.createElement('button'), { className: 'more', type: 'button', textContent: `Ukázat všech ${rows.length}` });
      b.onclick = () => { expanded.add(key); render(); };
      sec.append(b);
    }
  }
}
const LIMIT = { now: Infinity, soon: 8, ending: Infinity, next: 8 };
const expanded = new Set();

tzSel.addEventListener('change', () => {
  try { localStorage.setItem('fishdex:settings:v1', JSON.stringify({ version: 1, tz: tzSel.value })); } catch { /* not saved */ }
  render();
});
document.getElementById('area').addEventListener('change', render);
document.getElementById('hide-caught').addEventListener('change', render);
render();
if (!fixedNow) setInterval(render, 30_000);
