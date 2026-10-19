# Bijdragen

Dit project is een lokale Nuxt-app. Bijdragen zijn welkom als ze een module kleiner, duidelijker of betrouwbaarder maken.

## Omgeving

1. Node.js 22+.
2. `corepack pnpm install`
3. Kopieer `.env.example` naar `.env` en vul secrets in.
4. `corepack pnpm dev`

De database hoeft geen aparte migratie voor een schone start: `server/db/ensure.ts` maakt de tabellen. Na een schemawijziging werk je zowel `server/db/schema.ts` als `server/db/ensure.ts` bij, en draai je `corepack pnpm db:push` op een bestaande database.

## Afspraken

- TypeScript overal. Vue-componenten in `app/components`, PascalCase als bestandsnaam.
- Tailwind voor stijl. Geen losse CSS behalve het thema in `app/assets/css/main.css` en de cropper.
- Nieuwe zichtbare tekst hoort in `i18n/locales/nl.json` en `en.json`. Nederlands is de standaardtaal.
- Elke `server/api`-invoer wordt met Zod gecontroleerd.
- Secrets blijven in `.env`. OAuth-tokens en het SMTP-wachtwoord gaan versleuteld de database in via `server/utils/crypto.ts`.
- Geen e-mailscraping en geen trucs om spamfilters te omzeilen. Ontvangers komen van de gebruiker.

## Pull requests

Beschrijf welk gedrag verandert en hoe je het lokaal hebt gecontroleerd. Houd een PR bij één module als dat kan: Brain, strategie, social, SEO of outreach.

Een nieuwe social provider volgt [docs/social-providers.md](docs/social-providers.md).
