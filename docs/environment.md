# Omgevingsvariabelen

Kopieer `.env.example` naar `.env`. Alles hieronder wordt bij het starten van Nuxt gelezen.

| Variabele | Rol |
| --- | --- |
| `BETTER_AUTH_SECRET` | Ondertekening van sessies. Minstens 32 tekens, uniek per machine. |
| `BETTER_AUTH_URL` | Publieke oorsprong, lokaal `http://localhost:3000`. OAuth-redirects worden hierop gebouwd. |
| `DATABASE_URL` | SQLite-bestand, standaard `file:.data/app.db`. |
| `ENCRYPTION_KEY` | Sleutel voor OAuth-tokens en het SMTP-wachtwoord. |
| `AI_PROVIDER` | `openai` of `anthropic`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Sleutel van de gekozen aanbieder. |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Modelnaam die jouw account mag gebruiken. |
| `IMAGE_PROVIDER` | `openai` of `none`. |
| `OPENAI_IMAGE_MODEL` | Beeldmodel, standaard `gpt-image-1`. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn-app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/linkedin`. |
| `META_APP_ID` / `META_APP_SECRET` | Meta-app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/meta`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud, YouTube Data API. Redirect: `{BETTER_AUTH_URL}/api/social/callback/youtube`. |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok-app. Redirect: `{BETTER_AUTH_URL}/api/social/callback/tiktok`. |
| `TIKTOK_PRIVACY` | Standaard `SELF_ONLY` zolang de app niet is goedgekeurd. |
| `MAIL_API_URL` / `MAIL_API_KEY` | Optionele HTTP-mail, JSON met `from`, `to`, `subject`, `text`, `html`. |
| `OUTREACH_DAILY_LIMIT` | Maximum verzonden outreach-mails per gebruiker per dag. |

Zonder social-sleutels blijft de rest van de app bruikbaar. De accountpagina toont dan welke sleutels ontbreken.

Instagram kan een lokale afbeelding niet ophalen. Zet `BETTER_AUTH_URL` op een publiek adres (bijvoorbeeld een tunnel) als je naar Instagram wil publiceren.
