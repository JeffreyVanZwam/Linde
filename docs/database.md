# Database

SQLite via `@libsql/client` and Drizzle. Path: `DATABASE_URL`, default `file:.data/app.db`.

`server/plugins/db.ts` calls `ensureDatabase()` on startup. That runs `CREATE TABLE IF NOT EXISTS`. The Drizzle schema in `server/db/schema.ts` is the source for types and for `pnpm db:push`.

## Tables

- `user`, `session`, `account`, `verification` — better-auth.
- `brands` — one brand profile per user.
- `conversations`, `messages` — chats per module (`strategy`, `social`, `seo`, `outreach`).
- `social_accounts` — platform, external id, encrypted tokens.
- `media_assets` — upload, generated, edited or from Brain.
- `social_posts`, `social_post_targets` — one post, several platforms. `source` is `local` or `synced`.
- `site_articles`, `article_drafts` — inventory and SEO drafts.
- `smtp_connections` — the user's mailbox.
- `outreach_campaigns`, `outreach_steps`, `outreach_recipients`, `outreach_messages`.

## Changing the schema

1. Update `server/db/schema.ts`.
2. Put the same statement in `server/db/ensure.ts`, so a fresh install gets it too.
3. Existing databases: `corepack pnpm db:push`.

Do not put secrets in plain columns. Tokens and passwords use `encrypt()` from `server/utils/crypto.ts`.
