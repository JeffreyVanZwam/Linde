# Architectuur

Eén Nuxt 4-app. De browser praat alleen met Nitro-routes. SQLite (libSQL) bewaart gebruikers, merk, chats, posts en campagnes in `.data/app.db`.

```text
app/            pagina's, layouts, componenten
i18n/locales    nl (standaard) en en
server/api      HTTP-routes, invoer via Zod
server/db       Drizzle-schema en het aanmaakscript
server/utils    auth, AI, Brain, social, mail, SEO
server/tasks    minutelijke publicatie en verzending
shared/         platformlimieten voor client en server
```

## Auth

better-auth met e-mail en wachtwoord. De handler staat op `server/api/auth/[...all].ts`. `app/middleware/auth.global.ts` stuurt anonieme bezoekers naar login en nieuwe gebruikers naar onboarding zolang het merkprofiel niet bevestigd is.

## AI

`server/utils/ai.ts` kiest OpenAI of Anthropic op basis van `AI_PROVIDER`. Afbeeldingen komen alleen van OpenAI, of helemaal niet als `IMAGE_PROVIDER=none`. Chats lopen via `streamText` in `server/utils/chat/run.ts`. Tools schrijven concepten weg; de tekststroom legt uit wat er gebeurde.

## Achtergrondtaken

Nitro draait elke minuut `social:publish` en `outreach:send`. Die taken pakken alleen posts met status `scheduled` en mails met status `approved` of `scheduled` waarvan het tijdstip verstreken is. Lokaal gebeurt dat alleen terwijl `pnpm dev` draait.

## Bestanden

Uploads staan in `.data/uploads/{userId}`. `GET /api/media/:id` geeft het bestand aan de eigenaar, of aan een platform dat een korte ondertekende URL meekrijgt (Instagram).
