import * as cheerio from 'cheerio'
import { generateObject } from 'ai'
import { z } from 'zod'
import { aiConfig, getLanguageModel, hasLanguageModel } from '../ai'
import { saveMedia } from '../media'

const brandSchema = z.object({
  companyName: z.string(),
  whoTheyAre: z.string(),
  whatTheyDo: z.string(),
  audience: z.string(),
  toneOfVoice: z.string(),
  colors: z.array(z.string()).max(6),
  fonts: z.array(z.string()).max(4),
})

export type ExtractedBrand = z.infer<typeof brandSchema> & {
  websiteUrl: string
  logoMediaId: string | null
  imageIds: string[]
}

const genericFonts = new Set(['inherit', 'initial', 'unset', 'serif', 'sans-serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-serif', 'emoji', 'cursive', 'fantasy'])

export async function extractBrand(userId: string, websiteUrl: string, locale: 'nl' | 'en'): Promise<ExtractedBrand> {
  const page = await readPage(websiteUrl)
  const imageIds: string[] = []
  let logoMediaId: string | null = null

  if (page.logoUrl) {
    const saved = await downloadAsset(userId, page.logoUrl, page.finalUrl, 'brand')
    logoMediaId = saved
  }
  for (const imageUrl of page.imageUrls.slice(0, 6)) {
    const saved = await downloadAsset(userId, imageUrl, page.finalUrl, 'brand')
    if (saved) imageIds.push(saved)
  }

  const heuristic = {
    companyName: page.title || new URL(page.finalUrl).hostname,
    whoTheyAre: page.description || '',
    whatTheyDo: page.description || '',
    audience: '',
    toneOfVoice: '',
    colors: page.colors.slice(0, 6),
    fonts: page.fonts.slice(0, 4),
  }

  let narrative = heuristic
  if (hasLanguageModel()) {
    try {
      const ai = aiConfig()
      const { object } = await generateObject({
        model: getLanguageModel(),
        maxRetries: ai.tier === 'free' ? 0 : 2,
        schema: brandSchema,
        abortSignal: AbortSignal.timeout(25_000),
        prompt: [
          locale === 'en'
            ? 'Extract a brand profile from this website. Write in English. Keep the tone description concrete and usable by a copywriter.'
            : 'Extraheer een merkprofiel uit deze website. Schrijf in het Nederlands. De tone-of-voice moet concreet genoeg zijn voor een copywriter.',
          `URL: ${page.finalUrl}`,
          `Titel: ${page.title}`,
          `Beschrijving: ${page.description}`,
          `Kleuren: ${page.colors.join(', ')}`,
          `Fonts: ${page.fonts.join(', ')}`,
          `Tekst:\n${page.text.slice(0, 8000)}`,
        ].join('\n\n'),
      })
      narrative = {
        ...object,
        colors: object.colors.length ? object.colors : heuristic.colors,
        fonts: object.fonts.length ? object.fonts : heuristic.fonts,
      }
    }
    catch {
      narrative = heuristic
    }
  }

  return {
    websiteUrl: page.finalUrl,
    logoMediaId,
    imageIds,
    ...narrative,
  }
}

async function readPage(rawUrl: string) {
  const url = assertHttpUrl(rawUrl)
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: { 'user-agent': 'MarketingDashboardBot/1.0' },
  }).catch((error) => {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Website niet bereikbaar' })
  })
  if (!response.ok) {
    throw createError({ statusCode: 400, statusMessage: `Website gaf ${response.status} terug` })
  }
  const html = (await response.text()).slice(0, 1_500_000)
  const $ = cheerio.load(html)
  const title = $('meta[property="og:site_name"]').attr('content') || $('title').first().text().trim()
  const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || ''
  const styles: string[] = []
  $('style').each((_, element) => {
    styles.push($(element).text())
  })
  const stylesheetUrls = $('link[rel="stylesheet"]')
    .map((_, element) => $(element).attr('href'))
    .get()
    .filter(Boolean)
    .slice(0, 3) as string[]
  for (const href of stylesheetUrls) {
    try {
      const cssUrl = new URL(href, response.url)
      const css = await fetch(cssUrl, { signal: AbortSignal.timeout(6_000) })
      if (css.ok) styles.push((await css.text()).slice(0, 200_000))
    }
    catch {
      continue
    }
  }
  const css = styles.join('\n')
  $('script, style, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  const imageUrls = unique([
    $('meta[property="og:image"]').attr('content'),
    ...$('img').map((_, element) => $(element).attr('src')).get(),
  ].filter((value): value is string => Boolean(value))).slice(0, 12)
  const logoUrl = $('link[rel="apple-touch-icon"]').attr('href')
    || $('link[rel="icon"]').attr('href')
    || $('meta[property="og:image"]').attr('content')
    || null
  return {
    finalUrl: response.url,
    title,
    description: description.trim(),
    text,
    colors: topColors(css),
    fonts: topFonts(css),
    imageUrls,
    logoUrl,
  }
}

async function downloadAsset(userId: string, assetUrl: string, baseUrl: string, source: string) {
  try {
    const url = new URL(assetUrl, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null
    const mime = (response.headers.get('content-type') || 'application/octet-stream').split(';')[0] || 'application/octet-stream'
    if (!mime.startsWith('image/')) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length || bytes.length > 2_000_000) return null
    return await saveMedia({ userId, bytes, mime, source })
  }
  catch {
    return null
  }
}

function assertHttpUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Voer een geldige http(s)-URL in' })
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Alleen http- en https-URL\'s zijn toegestaan' })
  }
  const host = url.hostname.toLowerCase()
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    throw createError({ statusCode: 400, statusMessage: 'Deze host is geblokkeerd' })
  }
  return url
}

function topColors(css: string) {
  const counts = new Map<string, number>()
  const matches = css.match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)/g) || []
  for (const match of matches) {
    const color = match.toLowerCase()
    if (['#fff', '#ffffff', '#000', '#000000'].includes(color)) continue
    counts.set(color, (counts.get(color) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([color]) => color)
}

function topFonts(css: string) {
  const counts = new Map<string, number>()
  const matches = css.match(/font-family\s*:\s*([^;}{]+)/gi) || []
  for (const match of matches) {
    const family = match.split(':').slice(1).join(':').split(',')[0]?.trim().replace(/['"]/g, '')
    if (!family) continue
    const key = family.toLowerCase()
    if (genericFonts.has(key)) continue
    counts.set(family, (counts.get(family) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([font]) => font)
}

function unique(values: string[]) {
  return [...new Set(values)]
}
