// Fishdex API for the Chovatelé tab. Plain fetch handler, no framework; everything that touches
// the outside world (database, Discord, clock) comes in through `Deps`, so tests run it in Node.
import BACKYARD_LIST from './backyard.json';
import FISH_LIST from './fish.json';
import { cleanCatches, cleanFish, cleanNick, nickKey, type Catches } from './validate';

/** Every fish of the game: what can be published as caught / glowing. */
export const ALL_FISH: ReadonlySet<string> = new Set(FISH_LIST as string[]);
export const BACKYARD: ReadonlySet<string> = new Set(BACKYARD_LIST as string[]);

// ---- the D1 subset we use (node:sqlite implements it in tests) ------------
export type Stmt = {
  bind(...values: unknown[]): Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
};
export type Db = { prepare(sql: string): Stmt; batch(statements: Stmt[]): Promise<unknown[]> };

export type Config = {
  clientId: string;
  clientSecret: string;
  adminIds: ReadonlySet<string>;
  /** Origins the web app runs on: CORS and where login may return to. */
  allowedOrigins: readonly string[];
};
export type Deps = { db: Db; config: Config; fetch: typeof fetch; now: () => number };

export const SESSION_TTL = 30 * 24 * 3600e3;
export const STATE_TTL = 10 * 60e3;
export const WRITE_INTERVAL = 3e3;
export const REPORT_LIMIT = 10;          // per reporter per 24 h
export const AUTO_HIDE_REPORTS = 3;
/** Two full lists of all fish are about 22 kB. */
const MAX_BODY = 64 * 1024;

const DISCORD_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN = 'https://discord.com/api/oauth2/token';
const DISCORD_ME = 'https://discord.com/api/users/@me';

type Hidden = 'admin' | 'reports' | null;
type Row = {
  no: number; discord_id: string; nick: string; fish: string; hidden: number;
  updated_at: number; avatar: string | null; reports: number;
  /** Sizes of the published lists, null = catches not published. */
  caught_n: number | null; glowing_n: number | null;
};
type User = { discord_id: string; avatar: string | null; banned: number; last_write_at: number };

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, readonly extra: Record<string, unknown> = {}) { super(code); }
}

// ---- helpers ----------------------------------------------------------------
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function avatarUrl(discordId: string, hash: string | null): string | null {
  return hash ? `https://cdn.discordapp.com/avatars/${discordId}/${hash}.png?size=96` : null;
}

const hiddenOf = (r: Pick<Row, 'hidden' | 'reports'>): Hidden =>
  r.hidden ? 'admin' : r.reports >= AUTO_HIDE_REPORTS ? 'reports' : null;

function entryOf(r: Row) {
  return {
    no: r.no, nick: r.nick, avatar: avatarUrl(r.discord_id, r.avatar), fish: JSON.parse(r.fish) as string[], updatedAt: r.updated_at,
    counts: r.caught_n === null ? null : { caught: r.caught_n, glowing: r.glowing_n ?? 0 },
  };
}

const ROW_SQL = `
  SELECT b.no, b.discord_id, b.nick, b.fish, b.hidden, b.updated_at, u.avatar,
         json_array_length(b.catches, '$.caught') AS caught_n, json_array_length(b.catches, '$.glowing') AS glowing_n,
         (SELECT COUNT(*) FROM reports r WHERE r.target_id = b.discord_id) AS reports
  FROM breeders b JOIN users u ON u.discord_id = b.discord_id`;

// ---- app ----------------------------------------------------------------------
export function createApp(deps: Deps) {
  const { db, config, now } = deps;

  function cors(req: Request): Record<string, string> {
    const origin = req.headers.get('Origin');
    if (!origin || !config.allowedOrigins.includes(origin)) return {};
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    };
  }

  const json = (req: Request, body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      // the same URL answers differently per origin and per login (admins see hidden entries)
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin, Authorization', ...cors(req), ...headers },
    });

  async function session(req: Request): Promise<User | null> {
    const m = /^Bearer ([\w-]{20,100})$/.exec(req.headers.get('Authorization') ?? '');
    if (!m) return null;
    return db.prepare(`
      SELECT u.discord_id, u.avatar, u.banned, u.last_write_at FROM sessions s
      JOIN users u ON u.discord_id = s.discord_id WHERE s.token_hash = ? AND s.expires_at > ?`)
      .bind(await sha256(m[1]), now()).first<User>();
  }
  async function requireUser(req: Request): Promise<User> {
    const u = await session(req);
    if (!u) throw new HttpError(401, 'unauthorized');
    return u;
  }
  async function requireAdmin(req: Request): Promise<User> {
    const u = await requireUser(req);
    if (!config.adminIds.has(u.discord_id)) throw new HttpError(403, 'forbidden');
    return u;
  }

  async function readBody(req: Request): Promise<Record<string, unknown>> {
    const text = await req.text();
    if (text.length > MAX_BODY) throw new HttpError(413, 'too_large');
    try {
      const v: unknown = JSON.parse(text);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    } catch { /* falls through */ }
    throw new HttpError(400, 'bad_request');
  }

  const rowByUser = (id: string) => db.prepare(`${ROW_SQL} WHERE b.discord_id = ?`).bind(id).first<Row>();
  const rowByNo = (no: number) => db.prepare(`${ROW_SQL} WHERE b.no = ?`).bind(no).first<Row>();

  /** The lists themselves never travel with the register, only one player at a time. */
  async function catchesOf(discordId: string): Promise<Catches | null> {
    const r = await db.prepare('SELECT catches FROM breeders WHERE discord_id = ?').bind(discordId).first<{ catches: string | null }>();
    return r?.catches ? JSON.parse(r.catches) as Catches : null;
  }

  async function myEntry(r: Row | null) {
    return r ? { ...entryOf(r), hidden: hiddenOf(r), catches: await catchesOf(r.discord_id) } : null;
  }

  function returnUrl(raw: string | null): URL {
    try {
      const u = new URL(raw ?? '');
      if (config.allowedOrigins.includes(u.origin)) return u;
    } catch { /* falls through */ }
    throw new HttpError(400, 'bad_return');
  }
  const backTo = (url: string, fragment: string) => {
    const u = new URL(url);
    u.hash = fragment;
    return Response.redirect(u.toString(), 302);
  };

  // ---- routes ----
  async function list(req: Request) {
    const viewer = await session(req);
    const admin = !!viewer && config.adminIds.has(viewer.discord_id);
    const { results } = await db.prepare(`${ROW_SQL} WHERE u.banned = 0 ORDER BY b.no`).all<Row>();
    const entries = results.flatMap(r => {
      const hidden = hiddenOf(r);
      if (hidden && !admin) return [];
      return [admin ? { ...entryOf(r), hidden, reports: r.reports } : entryOf(r)];
    });
    // anonymous lists may be cached briefly; anything personal never is
    return json(req, { entries }, 200, viewer ? {} : { 'Cache-Control': 'public, max-age=30' });
  }

  async function login(url: URL) {
    const back = returnUrl(url.searchParams.get('return'));
    const state = randomToken();
    const t = now();
    await db.batch([
      db.prepare('DELETE FROM oauth_states WHERE created_at < ?').bind(t - STATE_TTL),
      db.prepare('INSERT INTO oauth_states (state, return_url, created_at) VALUES (?, ?, ?)').bind(state, back.toString(), t),
    ]);
    const auth = new URL(DISCORD_AUTHORIZE);
    auth.search = new URLSearchParams({
      client_id: config.clientId, response_type: 'code', scope: 'identify', prompt: 'none',
      redirect_uri: `${url.origin}/auth/callback`, state,
    }).toString();
    return Response.redirect(auth.toString(), 302);
  }

  async function callback(url: URL) {
    const state = url.searchParams.get('state') ?? '';
    const row = await db.prepare('SELECT return_url, created_at FROM oauth_states WHERE state = ?').bind(state)
      .first<{ return_url: string; created_at: number }>();
    if (!row || row.created_at < now() - STATE_TTL) throw new HttpError(400, 'bad_state');
    await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

    const code = url.searchParams.get('code');
    if (!code) return backTo(row.return_url, 'auth_error=denied');

    const tokenRes = await deps.fetch(DISCORD_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'authorization_code',
        code, redirect_uri: `${url.origin}/auth/callback`,
      }),
    });
    if (!tokenRes.ok) return backTo(row.return_url, 'auth_error=failed');
    const { access_token } = await tokenRes.json() as { access_token?: string };
    const meRes = await deps.fetch(DISCORD_ME, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!meRes.ok) return backTo(row.return_url, 'auth_error=failed');
    const me = await meRes.json() as { id?: unknown; avatar?: unknown };
    if (typeof me.id !== 'string' || !/^\d{5,25}$/.test(me.id)) return backTo(row.return_url, 'auth_error=failed');
    const avatar = typeof me.avatar === 'string' && /^(a_)?[0-9a-f]{32}$/.test(me.avatar) ? me.avatar : null;

    const token = randomToken();
    const t = now();
    await db.batch([
      db.prepare(`INSERT INTO users (discord_id, avatar, created_at) VALUES (?, ?, ?)
                  ON CONFLICT (discord_id) DO UPDATE SET avatar = excluded.avatar`).bind(me.id, avatar, t),
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
      db.prepare('INSERT INTO sessions (token_hash, discord_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), me.id, t + SESSION_TTL),
    ]);
    return backTo(row.return_url, `session=${token}`);
  }

  async function logout(req: Request) {
    const m = /^Bearer ([\w-]{20,100})$/.exec(req.headers.get('Authorization') ?? '');
    if (m) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1])).run();
    return json(req, { ok: true });
  }

  async function getMe(req: Request) {
    const u = await requireUser(req);
    return json(req, {
      id: u.discord_id,
      admin: config.adminIds.has(u.discord_id),
      banned: !!u.banned,
      avatar: avatarUrl(u.discord_id, u.avatar),
      entry: await myEntry(await rowByUser(u.discord_id)),
    });
  }

  async function putMe(req: Request) {
    const u = await requireUser(req);
    if (u.banned) throw new HttpError(403, 'banned');
    const body = await readBody(req);
    const existing = await rowByUser(u.discord_id);

    let nick = existing?.nick ?? null;
    if (body.nick !== undefined) {
      nick = cleanNick(body.nick);
      if (!nick) throw new HttpError(400, 'nick_invalid');
    }
    if (!nick) throw new HttpError(400, 'nick_required');
    let fish = existing ? JSON.parse(existing.fish) as string[] : [];
    if (body.fish !== undefined) {
      const clean = cleanFish(body.fish, BACKYARD);
      if (!clean) throw new HttpError(400, 'fish_invalid');
      fish = clean;
    }
    // null = stop publishing (the stored lists are deleted), missing = leave as it is
    let catches = existing ? await catchesOf(u.discord_id) : null;
    if (body.catches === null) catches = null;
    else if (body.catches !== undefined) {
      catches = cleanCatches(body.catches, ALL_FISH);
      if (!catches) throw new HttpError(400, 'catches_invalid');
    }
    const catchesJson = catches && JSON.stringify(catches);

    const t = now();
    const wait = u.last_write_at + WRITE_INTERVAL - t;
    if (wait > 0) throw new HttpError(429, 'rate_limited', { retryAfter: Math.ceil(wait / 1000) });

    const key = nickKey(nick);
    const owner = await db.prepare('SELECT discord_id FROM breeders WHERE nick_key = ?').bind(key).first<{ discord_id: string }>();
    if (owner && owner.discord_id !== u.discord_id) throw new HttpError(409, 'nick_taken');

    const renamed = !!existing && existing.nick !== nick;
    const stmts = [
      existing
        ? db.prepare(`UPDATE breeders SET nick = ?, nick_key = ?, fish = ?, catches = ?, updated_at = ?, hidden = CASE WHEN ? THEN 0 ELSE hidden END
                      WHERE discord_id = ?`).bind(nick, key, JSON.stringify(fish), catchesJson, t, renamed ? 1 : 0, u.discord_id)
        : db.prepare(`INSERT INTO breeders (discord_id, nick, nick_key, fish, catches, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(u.discord_id, nick, key, JSON.stringify(fish), catchesJson, t, t),
      db.prepare('UPDATE users SET last_write_at = ? WHERE discord_id = ?').bind(t, u.discord_id),
    ];
    // a new nickname gets a clean slate (the mockup: "change it and the entry shows again")
    if (renamed) stmts.push(db.prepare('DELETE FROM reports WHERE target_id = ?').bind(u.discord_id));
    try {
      await db.batch(stmts);
    } catch (e) {
      if (String(e).includes('UNIQUE')) throw new HttpError(409, 'nick_taken');
      throw e;
    }
    return json(req, { entry: await myEntry(await rowByUser(u.discord_id)) });
  }

  async function deleteMe(req: Request) {
    const u = await requireUser(req);
    await removeEntry(u.discord_id);
    return json(req, { ok: true });
  }

  const removeEntry = (discordId: string) => db.batch([
    db.prepare('DELETE FROM breeders WHERE discord_id = ?').bind(discordId),
    db.prepare('DELETE FROM reports WHERE target_id = ?').bind(discordId),
  ]);

  async function target(no: string) {
    const r = await rowByNo(Number(no));
    if (!r) throw new HttpError(404, 'not_found');
    return r;
  }

  /** One player's published catches, for comparing journals. Hidden entries look like missing ones. */
  async function catches(req: Request, no: string) {
    const viewer = await session(req);
    const r = await target(no);
    const admin = !!viewer && config.adminIds.has(viewer.discord_id);
    if (hiddenOf(r) && !admin && viewer?.discord_id !== r.discord_id) throw new HttpError(404, 'not_found');
    const c = await catchesOf(r.discord_id);
    if (!c) throw new HttpError(404, 'not_published');
    // never cached: after "stop publishing" nobody should still get the lists
    return json(req, c);
  }

  async function report(req: Request, no: string) {
    const u = await requireUser(req);
    if (u.banned) throw new HttpError(403, 'banned');
    const r = await target(no);
    if (r.discord_id === u.discord_id) throw new HttpError(400, 'self_report');
    const t = now();
    const recent = await db.prepare('SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ? AND created_at > ?')
      .bind(u.discord_id, t - 24 * 3600e3).first<{ n: number }>();
    if ((recent?.n ?? 0) >= REPORT_LIMIT) throw new HttpError(429, 'report_limit');
    await db.prepare('INSERT OR IGNORE INTO reports (target_id, reporter_id, created_at) VALUES (?, ?, ?)')
      .bind(r.discord_id, u.discord_id, t).run();
    return json(req, { ok: true });
  }

  async function moderate(req: Request, no: string, action: string) {
    await requireAdmin(req);
    const r = await target(no);
    if (action === 'hide') await db.prepare('UPDATE breeders SET hidden = 1 WHERE no = ?').bind(r.no).run();
    else if (action === 'restore') await db.batch([
      db.prepare('UPDATE breeders SET hidden = 0 WHERE no = ?').bind(r.no),
      db.prepare('DELETE FROM reports WHERE target_id = ?').bind(r.discord_id),
    ]);
    else if (action === 'delete') await removeEntry(r.discord_id);
    else if (action === 'ban') {
      if (config.adminIds.has(r.discord_id)) throw new HttpError(400, 'cannot_ban_admin');
      await db.prepare('UPDATE users SET banned = 1 WHERE discord_id = ?').bind(r.discord_id).run();
      await removeEntry(r.discord_id);
    } else throw new HttpError(404, 'not_found');
    return json(req, { ok: true });
  }

  async function route(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const m = req.method;
    if (m === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });

    if (path === '/breeders' && m === 'GET') return list(req);
    if (path === '/auth/login' && m === 'GET') return login(url);
    if (path === '/auth/callback' && m === 'GET') return callback(url);
    if (path === '/auth/logout' && m === 'POST') return logout(req);
    if (path === '/me') {
      if (m === 'GET') return getMe(req);
      if (m === 'PUT') return putMe(req);
      if (m === 'DELETE') return deleteMe(req);
    }
    let p = /^\/breeders\/(\d{1,9})\/report$/.exec(path);
    if (p && m === 'POST') return report(req, p[1]);
    p = /^\/breeders\/(\d{1,9})\/catches$/.exec(path);
    if (p && m === 'GET') return catches(req, p[1]);
    p = /^\/admin\/breeders\/(\d{1,9})(?:\/(hide|restore|ban))?$/.exec(path);
    if (p && m === 'POST' && p[2]) return moderate(req, p[1], p[2]);
    if (p && m === 'DELETE' && !p[2]) return moderate(req, p[1], 'delete');
    if (path === '/' && m === 'GET') return json(req, { name: 'fishdex-api', ok: true });
    throw new HttpError(404, 'not_found');
  }

  return async function handle(req: Request): Promise<Response> {
    try {
      return await route(req);
    } catch (e) {
      if (e instanceof HttpError) return json(req, { error: e.code, ...e.extra }, e.status);
      console.error(e);
      return json(req, { error: 'server_error' }, 500);
    }
  };
}
