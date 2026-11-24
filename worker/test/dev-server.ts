// Local API for UI work without Cloudflare or Discord: the real app on node:sqlite, with a fake
// Discord login. `npx tsx test/dev-server.ts [--seed]` → http://localhost:8787
//   GET /dev/as?id=<discord id>   who the next "Přihlásit přes Discord" logs in as (default 100…01)
//   --seed                        fills the register with sample players
import { createServer } from 'node:http';
import { ALL_FISH, BACKYARD, createApp } from '../src/app';
import { memoryDb } from './sqlite';

const PORT = Number(process.env.PORT ?? 8787);
const ADMIN = '428601328571514900';
let nextUser = '100000000000000001';

const app = createApp({
  db: memoryDb(),
  now: Date.now,
  config: {
    clientId: 'dev', clientSecret: 'dev', adminIds: new Set([ADMIN]),
    allowedOrigins: ['http://localhost:5173', 'http://localhost:4173'],
  },
  // fake Discord: the token endpoint accepts anything, /users/@me returns `nextUser`
  fetch: async input => String(input).endsWith('/oauth2/token')
    ? Response.json({ access_token: 'dev' })
    : Response.json({ id: nextUser, avatar: null }),
});

/** Runs the whole OAuth round trip in place of the Discord consent screen. */
async function fakeLogin(url: URL): Promise<Response> {
  const start = await app(new Request(url));
  const to = start.headers.get('Location');
  if (start.status !== 302 || !to) return start;
  const state = new URL(to).searchParams.get('state');
  return app(new Request(`${url.origin}/auth/callback?code=dev&state=${state}`));
}

async function seed() {
  const fish = [...BACKYARD];
  const players: [string, number][] = [
    ['KaprKrál', 61], ['rybka_z_laketownu', 44], ['Pstruh007', 38], ['MořskáVlčice', 33], ['Thombani_Tom', 27],
    ['BarborkaFish', 21], ['ŠtikaŠtikovská', 18], ['zubáč', 14], ['Nocturne', 11], ['hlubinar', 6], ['TenNejdelšíNickVeHře', 2], ['Ondra_2010', 0],
  ];
  let i = 0;
  for (const [nick, n] of players) {
    nextUser = `90000000000000${String(++i).padStart(4, '0')}`;
    const back = await fakeLogin(new URL(`http://localhost:${PORT}/auth/login?return=${encodeURIComponent('http://localhost:5173/')}`));
    const token = new URL(back.headers.get('Location')!).hash.replace('#session=', '');
    const pick = fish.filter((_, k) => (k * 7 + i * 3) % 83 < n).slice(0, n);
    // every third player keeps their catches private
    const caught = [...ALL_FISH].filter((_, k) => (k * 31 + i * 17) % 100 < 70 - i * 5);
    const catches = i % 3 ? { caught, glowing: caught.filter((_, k) => k % 6 === 0) } : undefined;
    await app(new Request(`http://localhost:${PORT}/me`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ nick, fish: pick, catches }),
    }));
  }
  nextUser = '100000000000000001';
  console.log(`seeded ${players.length} players`);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  let out: Response;
  if (url.pathname === '/dev/as') {
    nextUser = url.searchParams.get('id') ?? nextUser;
    out = Response.json({ nextUser });
  } else {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, body });
    out = url.pathname === '/auth/login' ? await fakeLogin(url) : await app(request);
  }
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
}).listen(PORT, async () => {
  if (process.argv.includes('--seed')) await seed();
  console.log(`fishdex dev API on http://localhost:${PORT} (admin id ${ADMIN})`);
});
