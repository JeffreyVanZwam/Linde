# Modules

## Brain

`POST /api/brain/extract` fetches HTML and a few stylesheets, stores the logo and images, and asks the text model for the company name, who/what, audience, tone of voice, colours and fonts. Without an API key the heuristic fields remain and the user fills in the rest. `PUT /api/brain` saves the profile. The first confirmation sets `onboardingCompleted`.

## Strategy

`/strategy` is a chat without writing tools. The system prompt includes the brand profile. Conversations and messages stay in `conversations` and `messages`.

## Social

On Accounts the user saves a developer app, then `/api/social/connect/:provider` sends them to the platform login. The callback is `/api/social/callback/:provider`. Providers: `linkedin`, `meta`, `youtube`, `tiktok`. Meta creates a Facebook account per page and, when present, an Instagram account.

`POST /api/social/sync` reads recent posts. They land in the same post tables with `source: synced`. The composer and the social chat create local drafts. A Jaccard check warns when the text closely matches an earlier post.

Scheduling sets `status` to `scheduled`. The task publishes afterwards. Instagram needs a public image URL. YouTube and TikTok need a video.

The image editor uses Cropper.js to crop and rotate, and a canvas for brightness, contrast and one line of text.

## SEO / GEO

The articles URL lives on the brand. `POST /api/seo/refresh` reads that listing and stores the article links under the same path. A sitemap is only used when the listing has no article links; sitemap indexes are expanded and never stored as articles. The SEO chat can request that list and save a draft with markdown, FAQ, JSON-LD, keywords, internal links and GEO notes. The app does not publish the article to the site.

## Outreach

The chat stores a campaign and its steps. The user adds recipients (lines or CSV). "Create draft emails" prepares a message per recipient and step, not yet sent. Approving or choosing a time makes the message ready for the cron. Every email gets an unsubscribe link. A daily limit caps how many messages are sent. IMAP, when configured, stops the sequence after a reply from that address.

SMTP is stored encrypted. Without SMTP the app uses `MAIL_API_URL` and `MAIL_API_KEY`.
