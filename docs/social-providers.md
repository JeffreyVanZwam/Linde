# Een social provider toevoegen

De bestaande adapters staan in `server/utils/social/`. Elk platform heeft dezelfde vorm: een autorisatie-URL, een code-wissel, een profiel, recente posts en een publish-functie.

## Stappen

1. Voeg het platform toe aan `socialPlatforms` of, als het een aparte OAuth-app is, aan `connectProviders` in `shared/platforms.ts`. Zet daar ook de tekstlimiet en of een afbeelding of video verplicht is.
2. Maak `server/utils/social/<naam>.ts` met `authUrl`, `exchange`, `recent` en `publish`. Gebruik `formPost` en `jsonRequest` uit `http.ts`.
3. Hang de start-URL in `server/api/social/connect/[platform].get.ts`.
4. Hang de callback in `server/api/social/callback/[platform].get.ts` en sla het account op met `upsertSocialAccount`. Tokens worden daar versleuteld.
5. Roep `recent` aan vanuit `server/utils/social/sync.ts` en `publish` vanuit `server/utils/social/publish.ts`.
6. Vernieuw tokens in `readyAccount` als het platform een refresh-token heeft.
7. Zet de client-id en secret in `nuxt.config.ts` (`runtimeConfig`), `.env.example` en `docs/environment.md`.
8. Voeg de knop toe op `app/pages/social/accounts.vue` en een i18n-label als de naam niet het platform-id is.
9. Werk de kalenderfilter in `app/components/social/PostCalendar.vue` bij.

## Afspraken

- De redirect-URI is altijd `{BETTER_AUTH_URL}/api/social/callback/<provider>`.
- Een mislukte historie-sync mag het koppelen niet terugdraaien. Geef de fout terug als `warning`.
- Publiceer alleen targets die bij de ingelogde gebruiker horen. `publishPost` doet dat via het post-record.
- Schrijf geen tokens naar de logs.
