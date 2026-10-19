# Environment variables

Copy `.env.example` to `.env`. Nuxt reads everything below at startup.

| Variable | Role |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs sessions. At least 32 characters, unique per machine. |
| `BETTER_AUTH_URL` | Public origin, locally `http://localhost:3000`. OAuth redirects are built from this. |
| `DATABASE_URL` | SQLite file, default `file:.data/app.db`. |
| `ENCRYPTION_KEY` | Key for OAuth tokens and the SMTP password. |
| `AI_PROVIDER` | `openai` or `anthropic`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Key for the chosen provider. |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Model name your account is allowed to use. |
| `IMAGE_PROVIDER` | `openai` or `none`. |
| `OPENAI_IMAGE_MODEL` | Image model, default `gpt-image-1`. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/linkedin`. |
| `META_APP_ID` / `META_APP_SECRET` | Meta app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/meta`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud, YouTube Data API. Redirect: `{BETTER_AUTH_URL}/api/social/callback/youtube`. |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/tiktok`. |
| `TIKTOK_PRIVACY` | Default `SELF_ONLY` until the app is approved. |
| `MAIL_API_URL` / `MAIL_API_KEY` | Optional HTTP mail, JSON with `from`, `to`, `subject`, `text`, `html`. |
| `OUTREACH_DAILY_LIMIT` | Maximum outreach emails sent per user per day. |

Without social keys the rest of the app still works. The account page then shows which keys are missing.

Instagram cannot fetch a local image. Set `BETTER_AUTH_URL` to a public address (for example a tunnel) when you want to publish to Instagram.
