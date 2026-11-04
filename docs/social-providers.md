# Adding a social provider

The existing adapters live in `server/utils/social/`. LinkedIn, Facebook, Instagram, YouTube, TikTok, X and Pinterest each have the same shape: an authorization URL, a code exchange, a profile, recent posts and a publish function. X uses OAuth 2 PKCE (`X_CLIENT_ID` / `X_CLIENT_SECRET`, or a saved developer app). Pinterest uses the v5 API (`PINTEREST_APP_ID` / `PINTEREST_APP_SECRET`) and stores the chosen board id on the account. X posts stay within 280 characters. Pinterest needs an image and a title.

## Steps

1. Add the platform to `socialPlatforms` or, if it is a separate OAuth app, to `connectProviders` in `shared/platforms.ts`. Also set the text limit and whether an image or video is required.
2. Create `server/utils/social/<name>.ts` with `authUrl`, `exchange`, `recent` and `publish`. Use `formPost` and `jsonRequest` from `http.ts`.
3. Wire the start URL in `server/api/social/connect/[platform].get.ts`.
4. Wire the callback in `server/api/social/callback/[platform].get.ts` and save the account with `upsertSocialAccount`. Tokens are encrypted there.
5. Call `recent` from `server/utils/social/sync.ts` and `publish` from `server/utils/social/publish.ts`.
6. Refresh tokens in `readyAccount` when the platform has a refresh token.
7. Read the client id and secret through `socialApp()` in `server/utils/social/apps.ts`. Users save them on the accounts page; they are encrypted in `social_provider_apps`.
8. Add the provider to the accounts page and an i18n label when the name is not the platform id.
9. Update the calendar filter in `app/components/social/PostCalendar.vue`.

## Rules

- The redirect URI is always `{APP_URL}/api/social/callback/<provider>`.
- A failed history sync must not undo the connection. Return the error as `warning`.
- Publish only targets that belong to the signed-in user. `publishPost` does that through the post record.
- Do not write tokens to the logs.
