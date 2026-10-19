# Database

SQLite via `@libsql/client` en Drizzle. Pad: `DATABASE_URL`, standaard `file:.data/app.db`.

`server/plugins/db.ts` roept bij het opstarten `ensureDatabase()` aan. Die draait `CREATE TABLE IF NOT EXISTS`. Het Drizzle-schema in `server/db/schema.ts` is de bron voor types en voor `pnpm db:push`.

## Tabellen

- `user`, `session`, `account`, `verification` — better-auth.
- `brands` — één merkprofiel per gebruiker.
- `conversations`, `messages` — chats per module (`strategy`, `social`, `seo`, `outreach`).
- `social_accounts` — platform, externe id, versleutelde tokens.
- `media_assets` — upload, gegenereerd, bewerkt of uit Brain.
- `social_posts`, `social_post_targets` — één post, meerdere platformen. `source` is `local` of `synced`.
- `site_articles`, `article_drafts` — inventaris en SEO-concepten.
- `smtp_connections` — mailbox van de gebruiker.
- `outreach_campaigns`, `outreach_steps`, `outreach_recipients`, `outreach_messages`.

## Schema wijzigen

1. Pas `server/db/schema.ts` aan.
2. Zet hetzelfde statement in `server/db/ensure.ts`, zodat een lege installatie het ook krijgt.
3. Bestaande databases: `corepack pnpm db:push`.

Voeg geen secrets in gewone kolommen toe. Tokens en wachtwoorden gebruiken `encrypt()` uit `server/utils/crypto.ts`.
