# Architecture

One Nuxt 4 app. The browser talks to Nitro routes. PocketBase, started next to Nuxt, stores users, the brand, chats, posts, campaigns and files. The file browser also subscribes to PocketBase realtime for folders and files.

```text
app/            pages, layouts, components
i18n/locales    nl (default) and en
server/api      HTTP routes, input via Zod
server/utils    auth, PocketBase, AI, Brain, social, mail, SEO
server/tasks    minute-by-minute publishing and sending
pocketbase/     collection migrations
scripts/        download and start the PocketBase binary
shared/         platform limits for client and server
```

## Auth

PocketBase email and password. `POST /api/auth/login` and `POST /api/auth/register` set a `pb_auth` cookie for 14 days. `POST /api/auth/logout` clears it. The cookie is readable by the browser so the file page can subscribe to PocketBase. The first account becomes admin; later accounts are members. `app/middleware/auth.global.ts` sends anonymous visitors to login, and new users to onboarding until the brand profile is confirmed.

Admins manage users under Settings: create an account, change its role, or delete it. You cannot delete yourself or the last admin. Anyone can change their own name and password.

## AI

`server/utils/ai.ts` picks the text provider from `AI_PROVIDER`. The default is `free`: an OpenAI-compatible chat model that needs no key. `openai`, `anthropic` and `gemini` stay available when their keys are set. Images come only from OpenAI, or not at all when `IMAGE_PROVIDER=none`. Chats run through `streamText` in `server/utils/chat/run.ts`. Tools write drafts; the text stream explains what happened.

## Background tasks

Nitro runs `social:publish` and `outreach:send` every minute. Those tasks only pick up posts with status `scheduled` and mail with status `approved` or `scheduled` whose time has passed. Locally that happens only while `pnpm dev` is running.

## Files

PocketBase stores files in collection `library_files`. Users create, rename, move and delete folders, including nested ones. Uploading from the file page puts the file in the open folder. Brain, generation and the image editor file their results automatically: Brain, Gegenereerd, Bewerkingen, and Uploads for other media that has no folder yet.

Images show a `200x200` thumbnail. Other types show an icon from the mime type. A larger `800x0` thumb exists for previews. Files are protected. `GET /api/media/:id` serves them to the owner, or to a platform that receives a short signed URL (Instagram). Publishing reads the bytes through PocketBase, so the same path works for local disk and S3.

An admin switches storage in Settings. Local disk is the default. S3 needs a bucket, region, endpoint, access key and secret, with optional path-style URLs. The secret is never sent back to the browser; leaving it blank keeps the saved one. The S3 choice is one setting for the whole installation. The file page subscribes to `folders` and `library_files` and refreshes when they change.
