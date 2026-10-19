# Modules

## Brain

`POST /api/brain/extract` haalt HTML en een paar stylesheets op, bewaart logo en afbeeldingen, en vraagt het tekstmodel om bedrijfsnaam, wie/wat, doelgroep, tone of voice, kleuren en fonts. Zonder API-sleutel blijven de heuristische velden staan en vult de gebruiker de rest zelf in. `PUT /api/brain` bewaart het profiel. De eerste bevestiging zet `onboardingCompleted`.

## Strategie

`/strategy` is een chat zonder schrijftools. De systeemprompt bevat het merkprofiel. Gesprekken en berichten blijven in `conversations` en `messages`.

## Social

Koppelen start op `/api/social/connect/:provider` en komt terug op `/api/social/callback/:provider`. Providers: `linkedin`, `meta`, `youtube`, `tiktok`. Meta maakt per pagina een Facebook-account en, als die er is, een Instagram-account.

`POST /api/social/sync` leest recente posts in. Die komen in dezelfde posttabellen met `source: synced`. De composer en de social-chat maken lokale concepten. Een Jaccard-check waarschuwt als de tekst sterk op een eerdere post lijkt.

Inplannen zet `status` op `scheduled`. De taak publiceert daarna. Instagram heeft een publieke afbeeldings-URL nodig, YouTube en TikTok een video.

De afbeeldingseditor gebruikt Cropper.js om bij te snijden en te draaien, en een canvas voor helderheid, contrast en één tekstregel.

## SEO / GEO

De artikelen-URL staat op het merk. `POST /api/seo/refresh` leest die pagina en, als die bestaat, `/sitemap.xml`. De SEO-chat kan die lijst opvragen en een concept opslaan met markdown, FAQ, JSON-LD, zoekwoorden, interne links en GEO-notities. De app publiceert het artikel niet naar de site.

## Outreach

De chat slaat een campagne en stappen op. De gebruiker voegt zelf ontvangers toe (regels of CSV). "Conceptmails maken" zet per ontvanger en stap een bericht klaar, nog niet verzonden. Accorderen of een tijdstip kiezen maakt het bericht klaar voor de cron. Elke mail krijgt een afmeldlink. Een daglimiet beperkt het aantal verzonden berichten. IMAP, als ingevuld, stopt de reeks na een antwoord van dat adres.

SMTP gaat versleuteld de database in. Zonder SMTP gebruikt de app `MAIL_API_URL` en `MAIL_API_KEY`.
