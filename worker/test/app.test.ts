import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_FISH, AUTO_HIDE_REPORTS, BACKYARD, createApp, REPORT_LIMIT, SESSION_TTL, STATE_TTL, WRITE_INTERVAL } from '../src/app';
import { cleanFish, cleanNick } from '../src/validate';
import { memoryDb } from './sqlite';

const API = 'https://api.test';
const WEB = 'https://rountman.github.io';
const RETURN = `${WEB}/Fishdex/?tab=breeders`;
const ADMIN = '428601328571514900';
const [F1, F2, F3] = [...BACKYARD];
const AVATAR = 'a'.repeat(32);

let clock: number;
let app: ReturnType<typeof createApp>;
let db: ReturnType<typeof memoryDb>;
/** Discord user returned by the fake /users/@me for the next login. */
let discordUser: { id: string; avatar: string | null };
let discordFails = false;

const fakeFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (discordFails) return new Response('nope', { status: 500 });
  if (url === 'https://discord.com/api/oauth2/token') {
    const body = new URLSearchParams(String(init?.body));
    expect(body.get('client_secret')).toBe('secret');
    expect(body.get('redirect_uri')).toBe(`${API}/auth/callback`);
    return Response.json({ access_token: `at-${body.get('code')}` });
  }
  if (url === 'https://discord.com/api/users/@me') return Response.json({ ...discordUser, username: 'never-shown' });
  throw new Error(`unexpected fetch ${url}`);
};

beforeEach(() => {
  clock = Date.parse('2026-11-19T12:00:00Z');
  db = memoryDb();
  discordFails = false;
  app = createApp({
    db, fetch: fakeFetch, now: () => clock,
    config: { clientId: 'cid', clientSecret: 'secret', adminIds: new Set([ADMIN]), allowedOrigins: [WEB, 'http://localhost:5173'] },
  });
});

const req = (method: string, path: string, opts: { token?: string; body?: unknown; origin?: string } = {}) =>
  app(new Request(API + path, {
    method,
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.origin ? { Origin: opts.origin } : {}),
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
  }));

async function login(id: string, avatar: string | null = AVATAR): Promise<string> {
  discordUser = { id, avatar };
  const start = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
  const state = new URL(start.headers.get('Location')!).searchParams.get('state')!;
  const back = await req('GET', `/auth/callback?code=c${id}&state=${state}`);
  const hash = new URL(back.headers.get('Location')!).hash;
  const token = /^#session=([\w-]+)$/.exec(hash)?.[1];
  if (!token) throw new Error(`login failed: ${hash}`);
  return token;
}

async function publish(token: string, nick: string, fish: string[] = []) {
  clock += WRITE_INTERVAL;
  return req('PUT', '/me', { token, body: { nick, fish } });
}

const entries = async (token?: string) => (await (await req('GET', '/breeders', { token })).json() as { entries: Record<string, unknown>[] }).entries;

describe('validate', () => {
  it('accepts game-like nicknames and normalises spaces', () => {
    expect(cleanNick('KaprKrál')).toBe('KaprKrál');
    expect(cleanNick('  rybka_z.lake-town ')).toBe('rybka_z.lake-town');
    expect(cleanNick('Pepa   z  Brna')).toBe('Pepa z Brna');
    expect(cleanNick('TenNejdelšíNickVeHře')).toBe('TenNejdelšíNickVeHře'); // 20
  });
  it('rejects bad nicknames', () => {
    for (const bad of ['ab', 'x'.repeat(21), 'a<b>c', 'emoji🐟', '', 42, null, 'jméno@fishao']) expect(cleanNick(bad)).toBeNull();
  });
  it('keeps only backyard fish, unique and sorted', () => {
    expect(cleanFish([F2, F1, F2], BACKYARD)).toEqual([F1, F2].sort());
    expect(cleanFish(['great-white-shark'], BACKYARD)).toBeNull();
    expect(cleanFish('fire-eel', BACKYARD)).toBeNull();
    expect(cleanFish([1], BACKYARD)).toBeNull();
  });
});

describe('login', () => {
  it('redirects to Discord with only the identify scope', async () => {
    const res = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get('Location')!);
    expect(to.origin + to.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(to.searchParams.get('scope')).toBe('identify');
    expect(to.searchParams.get('client_id')).toBe('cid');
    expect(to.searchParams.get('redirect_uri')).toBe(`${API}/auth/callback`);
  });

  it('refuses to return anywhere but the web app', async () => {
    for (const r of ['https://evil.example/', 'javascript:alert(1)', '']) {
      expect((await req('GET', `/auth/login?return=${encodeURIComponent(r)}`)).status).toBe(400);
    }
  });

  it('returns a session in the fragment and stores only its hash', async () => {
    const token = await login('111111111111111111');
    expect(token.length).toBeGreaterThan(30);
    const stored = db.raw.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toContain(token);
    const me = await (await req('GET', '/me', { token })).json();
    expect(me).toEqual({
      id: '111111111111111111', admin: false, banned: false, entry: null,
      avatar: `https://cdn.discordapp.com/avatars/111111111111111111/${AVATAR}.png?size=96`,
    });
  });

  it('marks admins and keeps ids as exact strings', async () => {
    const me = await (await req('GET', '/me', { token: await login(ADMIN) })).json() as { admin: boolean };
    expect(me.admin).toBe(true);
  });

  it('sends the user back with an error when they cancel or Discord fails', async () => {
    let res = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
    let state = new URL(res.headers.get('Location')!).searchParams.get('state')!;
    res = await req('GET', `/auth/callback?error=access_denied&state=${state}`);
    expect(res.headers.get('Location')).toBe(`${RETURN}#auth_error=denied`);

    discordFails = true;
    res = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
    state = new URL(res.headers.get('Location')!).searchParams.get('state')!;
    res = await req('GET', `/auth/callback?code=x&state=${state}`);
    expect(res.headers.get('Location')).toBe(`${RETURN}#auth_error=failed`);
  });

  it('rejects unknown, reused and expired states', async () => {
    expect((await req('GET', '/auth/callback?code=x&state=forged')).status).toBe(400);
    discordUser = { id: '222222222222222222', avatar: null };
    const res = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
    const state = new URL(res.headers.get('Location')!).searchParams.get('state')!;
    expect((await req('GET', `/auth/callback?code=x&state=${state}`)).status).toBe(302);
    expect((await req('GET', `/auth/callback?code=x&state=${state}`)).status).toBe(400);

    const late = await req('GET', `/auth/login?return=${encodeURIComponent(RETURN)}`);
    const s2 = new URL(late.headers.get('Location')!).searchParams.get('state')!;
    clock += STATE_TTL + 1;
    expect((await req('GET', `/auth/callback?code=x&state=${s2}`)).status).toBe(400);
  });

  it('expires sessions and logs out', async () => {
    const token = await login('333333333333333333');
    expect((await req('GET', '/me', { token })).status).toBe(200);
    await req('POST', '/auth/logout', { token });
    expect((await req('GET', '/me', { token })).status).toBe(401);

    const t2 = await login('333333333333333333');
    clock += SESSION_TTL + 1;
    expect((await req('GET', '/me', { token: t2 })).status).toBe(401);
  });

  it('rejects requests without a valid token', async () => {
    expect((await req('GET', '/me')).status).toBe(401);
    expect((await req('PUT', '/me', { token: 'x'.repeat(43), body: { nick: 'abc' } })).status).toBe(401);
  });
});

describe('my entry', () => {
  let token: string;
  beforeEach(async () => { token = await login('444444444444444444'); });

  it('needs a nickname to publish', async () => {
    const res = await req('PUT', '/me', { token, body: { fish: [F1] } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'nick_required' });
  });

  it('validates nickname and fish', async () => {
    expect(await (await req('PUT', '/me', { token, body: { nick: 'a<' } })).json()).toEqual({ error: 'nick_invalid' });
    expect(await (await req('PUT', '/me', { token, body: { nick: 'Kapr', fish: ['not-a-fish'] } })).json()).toEqual({ error: 'fish_invalid' });
    expect((await req('PUT', '/me', { token, body: 'not json' })).status).toBe(400);
    expect((await req('PUT', '/me', { token, body: '[]' })).status).toBe(400);
  });

  it('publishes, then updates fish alone, keeping the entry number', async () => {
    const res = await publish(token, 'KaprKrál', [F2, F1]);
    expect(res.status).toBe(200);
    const { entry } = await res.json() as { entry: Record<string, unknown> };
    expect(entry).toMatchObject({ no: 1, nick: 'KaprKrál', fish: [F1, F2].sort(), hidden: null, updatedAt: clock });

    clock += WRITE_INTERVAL;
    const upd = await (await req('PUT', '/me', { token, body: { fish: [F3] } })).json() as { entry: Record<string, unknown> };
    expect(upd.entry).toMatchObject({ no: 1, nick: 'KaprKrál', fish: [F3] });
  });

  it('rate limits writes', async () => {
    await publish(token, 'KaprKrál');
    const res = await req('PUT', '/me', { token, body: { fish: [F1] } });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited', retryAfter: 3 });
  });

  it('keeps nicknames unique ignoring case', async () => {
    await publish(token, 'KaprKrál');
    const other = await login('555555555555555555');
    const res = await publish(other, 'kaprkrál');
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'nick_taken' });
    // own nickname in a different case is fine
    expect((await publish(token, 'KAPRKRÁL')).status).toBe(200);
  });

  it('deletes the entry; a new one gets a new number', async () => {
    await publish(token, 'KaprKrál', [F1]);
    expect((await req('DELETE', '/me', { token })).status).toBe(200);
    expect(await entries()).toEqual([]);
    const again = await (await publish(token, 'KaprKrál')).json() as { entry: { no: number } };
    expect(again.entry.no).toBe(2);
  });
});

describe('register and moderation', () => {
  let owner: string, admin: string, reporters: string[];
  beforeEach(async () => {
    owner = await login('600000000000000001');
    admin = await login(ADMIN);
    reporters = [];
    for (let i = 0; i < AUTO_HIDE_REPORTS; i++) reporters.push(await login(`70000000000000000${i}`));
    await publish(owner, 'Ošklivé_jméno', [F1, F2]);
  });

  it('lists public entries with avatar and no Discord name, cacheable when anonymous', async () => {
    const res = await req('GET', '/breeders');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=30');
    expect(res.headers.get('Vary')).toBe('Origin, Authorization');
    const list = (await res.json() as { entries: unknown[] }).entries;
    expect(list).toEqual([{
      no: 1, nick: 'Ošklivé_jméno', fish: [F1, F2].sort(), updatedAt: clock, counts: null,
      avatar: `https://cdn.discordapp.com/avatars/600000000000000001/${AVATAR}.png?size=96`,
    }]);
    expect(JSON.stringify(list)).not.toContain('never-shown');
    expect((await req('GET', '/breeders', { token: owner })).headers.get('Cache-Control')).toBe('no-store');
  });

  it('hides an entry after enough reports from different users', async () => {
    expect((await req('POST', '/breeders/1/report', { token: owner })).status).toBe(400); // own entry
    for (const r of reporters.slice(0, -1)) await req('POST', '/breeders/1/report', { token: r });
    await req('POST', '/breeders/1/report', { token: reporters[0] }); // repeated report counts once
    expect(await entries()).toHaveLength(1);

    await req('POST', '/breeders/1/report', { token: reporters.at(-1) });
    expect(await entries()).toEqual([]);
    expect(await entries(admin)).toMatchObject([{ no: 1, hidden: 'reports', reports: AUTO_HIDE_REPORTS }]);
    const me = await (await req('GET', '/me', { token: owner })).json() as { entry: { hidden: string } };
    expect(me.entry.hidden).toBe('reports');

    // renaming gives a clean slate
    await publish(owner, 'Hezké_jméno');
    expect(await entries()).toMatchObject([{ nick: 'Hezké_jméno' }]);
  });

  it('limits how many reports one user can send per day', async () => {
    const r = reporters[0];
    for (let i = 0; i < REPORT_LIMIT; i++) {
      const t = await login(`80000000000000${String(i).padStart(4, '0')}`);
      await publish(t, `hrac${i}`);
      expect((await req('POST', `/breeders/${i + 2}/report`, { token: r })).status).toBe(200);
    }
    expect((await req('POST', '/breeders/1/report', { token: r })).status).toBe(429);
    clock += 24 * 3600e3;
    expect((await req('POST', '/breeders/1/report', { token: r })).status).toBe(200);
  });

  it('lets only admins moderate', async () => {
    expect((await req('POST', '/admin/breeders/1/hide', { token: owner })).status).toBe(403);
    expect((await req('POST', '/admin/breeders/1/hide')).status).toBe(401);

    expect((await req('POST', '/admin/breeders/1/hide', { token: admin })).status).toBe(200);
    expect(await entries()).toEqual([]);
    expect(await entries(admin)).toMatchObject([{ hidden: 'admin' }]);

    expect((await req('POST', '/admin/breeders/1/restore', { token: admin })).status).toBe(200);
    expect(await entries()).toHaveLength(1);
    expect((await req('POST', '/admin/breeders/99/hide', { token: admin })).status).toBe(404);
  });

  it('restoring clears the reports', async () => {
    for (const r of reporters) await req('POST', '/breeders/1/report', { token: r });
    await req('POST', '/admin/breeders/1/restore', { token: admin });
    expect(await entries(admin)).toMatchObject([{ hidden: null, reports: 0 }]);
  });

  it('deletes and bans', async () => {
    expect((await req('DELETE', '/admin/breeders/1', { token: admin })).status).toBe(200);
    expect(await entries(admin)).toEqual([]);

    await publish(owner, 'Znovu');
    expect((await req('POST', '/admin/breeders/2/ban', { token: admin })).status).toBe(200);
    expect(await entries(admin)).toEqual([]);
    const res = await publish(owner, 'Potřetí');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'banned' });
    expect(await (await req('GET', '/me', { token: owner })).json()).toMatchObject({ banned: true, entry: null });
  });

  it('cannot ban an admin', async () => {
    await publish(admin, 'Moderátor');
    expect((await req('POST', '/admin/breeders/2/ban', { token: admin })).status).toBe(400);
  });
});

describe('published catches', () => {
  const [A, B] = [...ALL_FISH].filter(id => !BACKYARD.has(id));
  let owner: string;
  const put = (body: unknown, token = owner) => { clock += WRITE_INTERVAL; return req('PUT', '/me', { token, body }); };
  beforeEach(async () => {
    owner = await login('910000000000000001');
    await publish(owner, 'KaprKrál', [F1]);
  });

  it('are off until the player turns them on', async () => {
    expect(await entries()).toMatchObject([{ counts: null }]);
    const res = await req('GET', '/breeders/1/catches');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_published' });
  });

  it('are public once on: counts in the register, lists one player at a time', async () => {
    const { entry } = await (await put({ catches: { caught: [B, A, A], glowing: [B] } })).json() as { entry: Record<string, unknown> };
    expect(entry).toMatchObject({ fish: [F1], counts: { caught: 2, glowing: 1 }, catches: { caught: [A, B].sort(), glowing: [B] } });
    const [listed] = await entries();
    expect(listed).toMatchObject({ counts: { caught: 2, glowing: 1 } });
    expect(listed).not.toHaveProperty('catches');
    const res = await req('GET', '/breeders/1/catches');
    expect(await res.json()).toEqual({ caught: [A, B].sort(), glowing: [B] });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('stay when only the backyard or the nickname changes', async () => {
    await put({ catches: { caught: [A], glowing: [] } });
    await put({ fish: [F2] });
    await put({ nick: 'KaprCísař' });
    expect(await (await req('GET', '/breeders/1/catches')).json()).toEqual({ caught: [A], glowing: [] });
  });

  it('are deleted when turned off and when the entry is deleted', async () => {
    await put({ catches: { caught: [A], glowing: [] } });
    await put({ catches: null });
    expect((await req('GET', '/breeders/1/catches')).status).toBe(404);
    expect((db.raw.prepare('SELECT catches FROM breeders').get() as { catches: unknown }).catches).toBeNull();

    await put({ catches: { caught: [A], glowing: [] } });
    await req('DELETE', '/me', { token: owner });
    expect((await req('GET', '/breeders/1/catches')).status).toBe(404);
  });

  it('refuse unknown fish and wrong shapes, accept every fish of the game', async () => {
    for (const bad of [{ caught: ['nope'], glowing: [] }, { caught: [A] }, [], 'x', 1]) {
      expect(await (await put({ catches: bad })).json()).toEqual({ error: 'catches_invalid' });
    }
    const all = [...ALL_FISH];
    expect((await put({ fish: [...BACKYARD], catches: { caught: all, glowing: all } })).status).toBe(200);
  });

  it('of a hidden entry are only for its owner and admins', async () => {
    await put({ catches: { caught: [A], glowing: [] } });
    const admin = await login(ADMIN);
    await req('POST', '/admin/breeders/1/hide', { token: admin });
    expect((await req('GET', '/breeders/1/catches')).status).toBe(404);
    expect((await req('GET', '/breeders/1/catches', { token: await login('910000000000000002') })).status).toBe(404);
    expect((await req('GET', '/breeders/1/catches', { token: owner })).status).toBe(200);
    expect((await req('GET', '/breeders/1/catches', { token: admin })).status).toBe(200);
  });
});

describe('http', () => {
  it('answers CORS only for the web app', async () => {
    const ok = await req('OPTIONS', '/me', { origin: WEB });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(WEB);
    expect(ok.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    const bad = await req('GET', '/breeders', { origin: 'https://evil.example' });
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns JSON errors for unknown routes', async () => {
    const res = await req('GET', '/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });
});
