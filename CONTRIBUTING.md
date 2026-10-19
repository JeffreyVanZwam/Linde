# Contributing

Linde is a local Nuxt app, licensed under MIT. Contributions are welcome when they make a module smaller, clearer or more reliable.

## Setup

1. Node.js 22+.
2. `corepack pnpm install`
3. Copy `.env.example` to `.env` and fill in the secrets.
4. `corepack pnpm dev`

A clean install does not need a separate migration: `server/db/ensure.ts` creates the tables. After a schema change, update both `server/db/schema.ts` and `server/db/ensure.ts`, then run `corepack pnpm db:push` on an existing database.

## Conventions

- TypeScript everywhere. Vue components live in `app/components`, with PascalCase file names.
- Tailwind for styling. No extra CSS except the theme in `app/assets/css/main.css` and the cropper.
- New user-facing copy belongs in both `i18n/locales/nl.json` and `en.json`. Dutch is the default product language. Documentation stays in English.
- Every `server/api` entry is validated with Zod.
- Secrets stay in `.env`. OAuth tokens and the SMTP password are stored encrypted via `server/utils/crypto.ts`.
- No email scraping and no tricks to bypass spam filters. Recipients come from the user.

## Pull requests

Describe which behaviour changes and how you checked it locally. Keep a pull request to one module when you can: Brain, strategy, social, SEO or outreach.

A new social provider follows [docs/social-providers.md](docs/social-providers.md).

## Good places to start

- Docs that no longer match the code.
- A missing English or Dutch string.
- A provider, prompt or mail edge case you can reproduce locally.
