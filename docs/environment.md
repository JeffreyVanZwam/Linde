# Environment variables

Copy `.env.example` to `.env`. Nuxt reads everything below at startup.

| Variable | Role |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs sessions. At least 32 characters, unique per machine. |
| `BETTER_AUTH_URL` | Public origin, locally `http://localhost:3000`. OAuth redirects are built from this. |
| `DATABASE_URL` | SQLite file, default `file:.data/app.db`. |
| `ENCRYPTION_KEY` | Key for OAuth tokens and the SMTP password. |
| `AI_PROVIDER` | `openai`, `anthropic` or `gemini`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Key for the chosen provider. |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` / `GEMINI_MODEL` | Model name your account is allowed to use. |
| `IMAGE_PROVIDER` | `openai` or `none`. |
| `OPENAI_IMAGE_MODEL` | Image model, default `gpt-image-1`. |
| `MAIL_API_URL` / `MAIL_API_KEY` | Optional HTTP mail, JSON with `from`, `to`, `subject`, `text`, `html`. |
| `OUTREACH_DAILY_LIMIT` | Maximum outreach emails sent per user per day. |

Social apps are not environment variables. On Social → Accounts each user saves the developer-app client ID and secret, then logs in at the platform to link a profile or page. The redirect URI is `{BETTER_AUTH_URL}/api/social/callback/<provider>` with provider `linkedin`, `meta`, `youtube` or `tiktok`. TikTok visibility defaults to `SELF_ONLY`.

If `LINKEDIN_*`, `META_APP_*`, `GOOGLE_CLIENT_*`, `TIKTOK_CLIENT_*` or `TIKTOK_PRIVACY` are already set, they are used until that user saves credentials in the app. New setups do not need them.

Instagram cannot fetch a local image. Set `BETTER_AUTH_URL` to a public address (for example a tunnel) when you want to publish to Instagram.
