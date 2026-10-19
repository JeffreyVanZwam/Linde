# Linde

Lokaal marketingdashboard in Nuxt. De app heet Linde. Een geregistreerde gebruiker laat Brain een website uitlezen en gebruikt daarna chats voor strategie, social posts, SEO/GEO-artikelen en outreach. Het thema (Cyprus, Plum, Alabaster of Mint) staat in de header. Op een telefoon is Linde te installeren als app.

English summary: a local-only Nuxt app named Linde. Register, extract a brand from a website, then chat with a configurable LLM (OpenAI or Anthropic) for strategy, social drafting, SEO/GEO articles and outreach. Social publishing supports LinkedIn, Meta, YouTube and TikTok once you add your own developer-app keys. Choose a theme in the header. The app is a mobile-first PWA.

## Snel starten

Node.js 22 of nieuwer.

```bash
corepack pnpm install
cp .env.example .env
corepack pnpm dev
```

Open `http://localhost:3000`, maak een account en plak een website-URL. Het SQLite-bestand staat in `.data/app.db` en wordt bij de eerste start aangemaakt.

Pas in `.env` minstens `BETTER_AUTH_SECRET` en `ENCRYPTION_KEY` aan. Zonder `OPENAI_API_KEY` of `ANTHROPIC_API_KEY` werkt de extractie nog wel heuristisch (titel, kleuren, fonts, beelden), maar de chats niet.

## Wat het doet

- Registratie en login zijn verplicht.
- Brain leest logo, beelden, kleuren, fonts, bedrijfsverhaal en tone of voice van een URL.
- Strategiechat gebruikt dat merkprofiel.
- Social: OAuth voor LinkedIn, Meta (Facebook en Instagram), YouTube en TikTok. Concepten, platformspecifieke tekst, duplicaatwaarschuwing, afbeelding genereren of bewerken, inplannen en een kalender.
- SEO/GEO: artikelen-URL en sitemap, daarna een chat die een gestructureerd concept wegschrijft.
- Outreach: voorbeeldmails, SMTP of een HTTP-mail-API, accorderen, inplannen en een cron die alleen goedgekeurde mail verstuurt.

De dev-server moet aanstaan voor de minutelijke publicatie- en verzendtaak.

## Documentatie

- [Architectuur](docs/architecture.md)
- [Modules](docs/modules.md)
- [Database](docs/database.md)
- [Omgevingsvariabelen](docs/environment.md)
- [Social providers toevoegen](docs/social-providers.md)
- [Bijdragen](CONTRIBUTING.md)

## Licentie

MIT. Zie [LICENSE](LICENSE).
