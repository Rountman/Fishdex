// Cloudflare Worker entry: wires the real D1 binding, secrets and fetch into the app.
import { createApp, type Db } from './app';

export type Env = {
  DB: D1Database;
  DISCORD_CLIENT_ID: string;
  /** `wrangler secret put DISCORD_CLIENT_SECRET` — never in the repo. */
  DISCORD_CLIENT_SECRET: string;
  /** Comma-separated Discord ids. */
  ADMIN_IDS: string;
  /** Comma-separated origins of the web app. */
  ALLOWED_ORIGINS: string;
};

const list = (s: string | undefined) => (s ?? '').split(',').map(x => x.trim()).filter(Boolean);

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const app = createApp({
      db: env.DB as unknown as Db,
      config: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET ?? '',
        adminIds: new Set(list(env.ADMIN_IDS)),
        allowedOrigins: list(env.ALLOWED_ORIGINS),
      },
      fetch: (input, init) => fetch(input, init),
      now: Date.now,
    });
    return app(req);
  },
} satisfies ExportedHandler<Env>;
