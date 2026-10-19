# Architecture

One Nuxt 4 app. The browser talks only to Nitro routes. SQLite (libSQL) stores users, the brand, chats, posts and campaigns in `.data/app.db`.

```text
app/            pages, layouts, components
i18n/locales    nl (default) and en
server/api      HTTP routes, input via Zod
server/db       Drizzle schema and the create script
server/utils    auth, AI, Brain, social, mail, SEO
server/tasks    minute-by-minute publishing and sending
shared/         platform limits for client and server
```

## Auth

better-auth with email and password. The handler is `server/api/auth/[...all].ts`. `app/middleware/auth.global.ts` sends anonymous visitors to login, and new users to onboarding until the brand profile is confirmed.

## AI

`server/utils/ai.ts` picks OpenAI, Anthropic or Gemini from `AI_PROVIDER`. Images come only from OpenAI, or not at all when `IMAGE_PROVIDER=none`. Chats run through `streamText` in `server/utils/chat/run.ts`. Tools write drafts; the text stream explains what happened.

## Background tasks

Nitro runs `social:publish` and `outreach:send` every minute. Those tasks only pick up posts with status `scheduled` and mail with status `approved` or `scheduled` whose time has passed. Locally that happens only while `pnpm dev` is running.

## Files

Uploads live in `.data/uploads/{userId}`. `GET /api/media/:id` serves the file to its owner, or to a platform that receives a short signed URL (Instagram).
