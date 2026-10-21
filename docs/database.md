# Database

PocketBase is the database. `pnpm dev` downloads the binary into `.data/bin` when needed and serves it on `POCKETBASE_URL` (default `http://127.0.0.1:8090`). Data lives in `.data/pb`. Migrations in `pocketbase/pb_migrations` run on startup.

The Nuxt server uses a superuser (`POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`) for writes that happen outside a user request, such as publishing and mail. User requests check the PocketBase auth token from the `pb_auth` cookie.

## Collections

- `users` — PocketBase auth. Extra fields: `name`, `role` (`admin` or `member`).
- `brands` — one brand profile per user. Logo and images point at `library_files`.
- `conversations`, `messages` — chats per module (`strategy`, `social`, `seo`, `outreach`).
- `social_provider_apps` — per user, the developer-app client id and encrypted secret used to start OAuth.
- `social_accounts` — platform, external id, encrypted tokens.
- `folders`, `library_files` — the file library. `folders.parent` nests folders. `library_files.folder` is optional, so a file can sit at the root. The file field is protected, max 80 MB, with thumbs `200x200` and `800x0`. Deleting a folder deletes its children and files.
- `social_posts`, `social_post_targets` — one post, several platforms. `source` is `local` or `synced`.
- `site_articles`, `article_drafts` — inventory and SEO drafts.
- `smtp_connections` — the user's mailbox.
- `outreach_campaigns`, `outreach_steps`, `outreach_recipients`, `outreach_messages`.

Rules limit each record to its owner. The file browser subscribes to `folders` and `library_files`.

## Changing the schema

1. Add a migration under `pocketbase/pb_migrations`.
2. Restart PocketBase. `pnpm dev` does that.

Existing SQLite data from the previous better-auth database is not imported. Create the account again. Passwords cannot be copied across.

Do not put secrets in plain fields. Tokens and passwords use `encrypt()` from `server/utils/crypto.ts`.

## Storage

File bytes follow the PocketBase storage setting: local disk under `.data/pb/storage`, or S3 when an admin enables it in Settings. S3 is stored in the PocketBase settings (`s3.enabled`, bucket, region, endpoint, access key, secret, force path style), not in `.env`. `PUT /api/settings/storage` writes it. `POST /api/settings/storage/test` checks the connection. The secret stays on the server. That setting is global for the installation.
