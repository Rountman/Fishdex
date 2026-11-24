# fishdex-api — backend záložky Hráči

Cloudflare Worker + D1. Jediná část Fishdexu se serverem: veřejný registr chovu za domem a (opt-in)
úlovků pro porovnání deníků, přihlášení přes Discord (`identify`). Pravidla viz `CLAUDE.md` › Záložka Hráči.

## Lokálně (bez Cloudflare a Discordu)

```
npm ci
npm test                         # testy nad node:sqlite se skutečnými migracemi
npx tsx test/dev-server.ts --seed   # API na :8787, falešný Discord login, ukázkoví hráči
```

Web proti němu: v `web/` spusť `VITE_API_URL=http://localhost:8787 npm run dev`.
`GET /dev/as?id=<discord id>` určí, kdo se příště „přihlásí“ (admin = id z `ADMIN_IDS`).

## Nasazení (jednou)

1. `npx wrangler login`
2. `npx wrangler d1 create fishdex` → `database_id` do `wrangler.toml`
3. `npx wrangler d1 migrations apply fishdex --remote`
4. `npx wrangler secret put DISCORD_CLIENT_SECRET` (Client Secret z Discord Developer Portalu)
5. `npx wrangler deploy` → adresa `https://fishdex-api.<subdomain>.workers.dev`
6. Discord Developer Portal › OAuth2 › Redirects: `https://fishdex-api.<subdomain>.workers.dev/auth/callback`
7. Adresu API do `web/.env.production` (`VITE_API_URL=…`)

Další nasazení dělá GitHub Actions (`deploy.yml`, job `worker`) se secrety
`CLOUDFLARE_API_TOKEN` a `CLOUDFLARE_ACCOUNT_ID`.

## Moderace mimo web

Zrušit ban: `npx wrangler d1 execute fishdex --remote --command "UPDATE users SET banned = 0 WHERE discord_id = '<id>'"`
