# Linde

Linde is a local-first marketing dashboard built with Nuxt. Register, point it at a website, and let Brain extract a brand profile. From there, chat with your own LLM (OpenAI, Anthropic or Gemini) for strategy, social posts, SEO/GEO articles and outreach.

Social publishing supports LinkedIn, Meta (Facebook and Instagram), YouTube and TikTok. On Accounts you save a developer app, then log in at the platform to connect a profile or page. Pick a theme in the header (Cyprus, Plum, Alabaster or Mint). On a phone, Linde installs as a PWA.

The app runs on your machine. The SQLite database, uploads and API keys stay local.

## Quick start

Node.js 22 or newer.

```bash
corepack pnpm install
cp .env.example .env
corepack pnpm dev
```

Open `http://localhost:3000`, create an account and paste a website URL. The SQLite file lives at `.data/app.db` and is created on first start.

In `.env`, change at least `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`. Without `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`, extraction still works heuristically (title, colours, fonts, images), but the chats do not.

## What it does

- Registration and login are required.
- Brain reads the logo, images, colours, fonts, company story and tone of voice from a URL.
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
