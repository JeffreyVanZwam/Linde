# Linde

## We are actively looking for contributors to this project! Check "Contributing" tab for details

Linde is a local-first marketing dashboard built with Nuxt. Register, point it at a website, and let Brain extract a brand profile. From there, chat for strategy, social posts, SEO/GEO articles and outreach. The default text model is free and needs no key. OpenAI, Anthropic and Gemini stay available when you add your own keys.

Social publishing supports LinkedIn, Meta (Facebook and Instagram), YouTube and TikTok. On Accounts you save a developer app, then log in at the platform to connect a profile or page. Pick a theme in the header (Cyprus, Plum, Alabaster or Mint). On a phone, Linde installs as a PWA.

The app runs on your machine. PocketBase, uploads and API keys stay local unless you point file storage at S3.

## Quick start

Node.js 22 or newer.

```bash
corepack pnpm install
cp .env.example .env
corepack pnpm dev
```

Open `http://localhost:3000`, create an account and paste a website URL. `pnpm dev` starts Nuxt and PocketBase. The database lives in `.data/pb`.

In `.env`, change at least `ENCRYPTION_KEY` and `POCKETBASE_ADMIN_PASSWORD`. Chats use the free text model unless `AI_PROVIDER` is set to `openai`, `anthropic` or `gemini`. If that free call fails, brand extraction still keeps the heuristic fields (title, colours, fonts, images). The first account is an admin and can switch file storage between local disk and S3.

## What it does

- Registration and login are required. The first account is an admin and manages other users under Settings.
- Brain reads the logo, images, colours, fonts, company story and tone of voice from a URL. Those files land in the Brain folder.
- Files: folders you create, thumbnails for images, icons for other types, and a choice between local disk and S3.
- The strategy chat uses that brand profile.
- Social: OAuth for LinkedIn, Meta (Facebook and Instagram), YouTube and TikTok. Drafts, platform-specific copy, a duplicate warning, image generation or editing, scheduling and a calendar.
- SEO/GEO: an articles URL and sitemap, then a chat that writes a structured draft.
- Outreach: sample emails, SMTP or an HTTP mail API, approval, scheduling and a cron that sends only approved mail.

The dev server must be running for the minute-by-minute publish and send task.

## Documentation

- [Architecture](docs/architecture.md)
- [Modules](docs/modules.md)
- [Database](docs/database.md)
- [Environment variables](docs/environment.md)
- [Adding a social provider](docs/social-providers.md)
- [Contributing](CONTRIBUTING.md)

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and how a new social provider fits in.

Useful first contributions: a doc fix, a missing locale string in `i18n/locales/nl.json` and `en.json`, or a small change inside one module (Brain, strategy, social, SEO or outreach).

The product UI is bilingual. Dutch is the default locale. Project documentation is English.

## License

MIT. See [LICENSE](LICENSE).
