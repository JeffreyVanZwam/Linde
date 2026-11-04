import * as cheerio from 'cheerio'
import { generateObject } from 'ai'
import { z } from 'zod'
import { legacyFromDossier, type BrandDossier } from '~~/shared/dossier'
import { aiConfig, getLanguageModel, hasLanguageModel } from '../ai'
import { saveMedia } from '../media'
import { generateDossier } from './dossier'

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
  dossier: BrandDossier
}

const genericFonts = new Set(['inherit', 'initial', 'unset', 'serif', 'sans-serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-serif', 'emoji', 'cursive', 'fantasy'])

export async function extractBrand(userId: string, brandId: string, websiteUrl: string, locale: 'nl' | 'en'): Promise<ExtractedBrand> {
  const page = await readSite(websiteUrl)
  const imageIds: string[] = []
  let logoMediaId: string | null = null

  if (page.logoUrl) {
    const saved = await downloadAsset(userId, brandId, page.logoUrl, page.finalUrl, 'brand')
    logoMediaId = saved
  }
  for (const imageUrl of page.imageUrls.slice(0, 6)) {
    const saved = await downloadAsset(userId, brandId, imageUrl, page.finalUrl, 'brand')
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

  const [narrative, dossier] = await Promise.all([
    narrate(page, locale, heuristic),
    generateDossier({
      locale,
      url: page.finalUrl,
      title: page.title,
      description: page.description,
      text: page.text,
    }, heuristic.companyName),
  ])
  const legacy = legacyFromDossier(dossier)

  return {
    websiteUrl: page.finalUrl,
    logoMediaId,
    imageIds,
    companyName: legacy.companyName || narrative.companyName,
    whoTheyAre: legacy.whoTheyAre || narrative.whoTheyAre,
    whatTheyDo: legacy.whatTheyDo || narrative.whatTheyDo,
    audience: legacy.audience || narrative.audience,
    toneOfVoice: legacy.toneOfVoice || narrative.toneOfVoice,
    colors: narrative.colors,
    fonts: narrative.fonts,
    dossier,
  }
}

async function narrate(page: Awaited<ReturnType<typeof readPage>>, locale: 'nl' | 'en', heuristic: z.infer<typeof brandSchema>) {
  if (!hasLanguageModel()) return heuristic
  try {
    const ai = aiConfig()
    const { object } = await generateObject({
      model: getLanguageModel(),
      maxRetries: ai.tier === 'free' ? 0 : 2,
      schema: brandSchema,
      abortSignal: AbortSignal.timeout(40_000),
      prompt: [
        locale === 'en'
          ? 'Extract a brand profile from these pages. Write in English. whoTheyAre, whatTheyDo, audience, and toneOfVoice are each a short paragraph a copywriter can use, not a single clause.'
          : 'Extraheer een merkprofiel uit deze pagina\'s. Schrijf in het Nederlands. whoTheyAre, whatTheyDo, audience en toneOfVoice zijn elk een korte alinea die een copywriter kan gebruiken, geen losse zin.',
        `URL: ${page.finalUrl}`,
        `Titel: ${page.title}`,
        `Beschrijving: ${page.description}`,
        `Kleuren: ${page.colors.join(', ')}`,
        `Fonts: ${page.fonts.join(', ')}`,
        `Tekst:\n${page.text.slice(0, 16_000)}`,
      ].join('\n\n'),
    })
    return {
      ...object,
      colors: object.colors.length ? object.colors : heuristic.colors,
      fonts: object.fonts.length ? object.fonts : heuristic.fonts,
    }
  }
  catch {
    return heuristic
  }
}

type PageCopy = {
  finalUrl: string
  title: string
  description: string
  headings: string[]
  navigation: string[]
  jsonLd: string
  text: string
}

async function readSite(rawUrl: string) {
  const home = await readPage(rawUrl)
  const linked = await readLinkedPages(home.links)
  return {
    ...home,
    text: formatPages([home, ...linked]),
  }
}

async function readPage(rawUrl: string) {
  const url = assertHttpUrl(rawUrl)
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: { 'user-agent': 'MarketingDashboardBot/1.0', accept: 'text/html' },
  }).catch((error) => {
    throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Website niet bereikbaar' })
  })
  if (!response.ok) {
    throw createError({ statusCode: 400, statusMessage: `Website gaf ${response.status} terug` })
  }
  const html = (await response.text()).slice(0, 1_500_000)
  const $ = cheerio.load(html)
  const copy = readCopy($, response.url)
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
  const imageUrls = unique([
    $('meta[property="og:image"]').attr('content'),
    ...$('img').map((_, element) => $(element).attr('src')).get(),
  ].filter((value): value is string => Boolean(value))).slice(0, 12)
  const logoUrl = $('link[rel="apple-touch-icon"]').attr('href')
    || $('link[rel="icon"]').attr('href')
    || $('meta[property="og:image"]').attr('content')
    || null
  return {
    ...copy,
    links: rankLinks(collectAnchors($), response.url),
    colors: topColors(css),
    fonts: topFonts(css),
    imageUrls,
    logoUrl,
  }
}

async function readLinkedPages(links: string[]) {
  const pages: PageCopy[] = []
  for (let index = 0; index < links.length; index += 3) {
    const batch = await Promise.all(links.slice(index, index + 3).map(link => readContentPage(link)))
    for (const page of batch) {
      if (page && (page.text.trim().length >= 80 || page.headings.length > 0)) pages.push(page)
    }
  }
  return pages
}

async function readContentPage(rawUrl: string): Promise<PageCopy | null> {
  try {
    const url = assertHttpUrl(rawUrl)
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
      headers: { 'user-agent': 'MarketingDashboardBot/1.0', accept: 'text/html' },
    })
    if (!response.ok) return null
    const type = response.headers.get('content-type') || ''
    if (type && !type.includes('html') && !type.includes('xml')) return null
    if (new URL(response.url).hostname !== url.hostname) return null
    const html = (await response.text()).slice(0, 800_000)
    return readCopy(cheerio.load(html), response.url)
  }
  catch {
    return null
  }
}

function readCopy($: ReturnType<typeof cheerio.load>, finalUrl: string): PageCopy {
  const title = $('meta[property="og:site_name"]').attr('content')
    || $('title').first().text().replace(/\s+/g, ' ').trim()
    || $('h1').first().text().replace(/\s+/g, ' ').trim()
  const description = ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').replace(/\s+/g, ' ').trim()
  const headings = unique($('h1, h2, h3').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean)).slice(0, 24)
  const navigation = unique($('header a, nav a').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(item => item.length > 1 && item.length < 80)).slice(0, 24)
  const jsonLd = collectJsonLd($)
  const text = visibleText($)
  return { finalUrl, title, description, headings, navigation, jsonLd, text }
}

function visibleText($: ReturnType<typeof cheerio.load>) {
  const main = $('main, [role="main"], article').first()
  const root = main.length ? main : $('body')
  const blocks = root.find('h1, h2, h3, p, li, blockquote').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(item => item.length > 1)
  const structured = unique(blocks).join('\n')
  if (structured.length >= 200) return structured.slice(0, 6_000)
  const clone = root.clone()
  clone.find('script, style, noscript, svg').remove()
  clone.find('h1, h2, h3, h4, p, li, div, section, article, td, th, br').append('\n')
  return clone.text().replace(/[^\S\n]+/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, 6_000)
}

function collectJsonLd($: ReturnType<typeof cheerio.load>) {
  const chunks: string[] = []
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim()
    if (!raw) return
    try {
      chunks.push(JSON.stringify(JSON.parse(raw)).slice(0, 2_000))
    }
    catch {
      chunks.push(raw.slice(0, 500))
    }
  })
  return chunks.join('\n').slice(0, 4_000)
}

function collectAnchors($: ReturnType<typeof cheerio.load>) {
  return $('a[href]').map((_, element) => ({
    href: $(element).attr('href') || '',
    label: $(element).text().replace(/\s+/g, ' ').trim(),
  })).get()
}

function rankLinks(links: Array<{ href: string, label: string }>, base: string) {
  let origin: URL
  try {
    origin = new URL(base)
  }
  catch {
    return []
  }
  const scored = new Map<string, number>()
  const homePath = origin.pathname.replace(/\/+$/, '') || '/'
  for (const link of links) {
    let url: URL
    try {
      url = new URL(link.href, origin)
    }
    catch {
      continue
    }
    if (url.hostname !== origin.hostname || !['http:', 'https:'].includes(url.protocol)) continue
    url.hash = ''
    url.search = ''
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
    const path = url.pathname || '/'
    if (path === homePath || path === '/') continue
    if (/\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|css|js)$/i.test(path)) continue
    const haystack = `${path} ${link.label}`
    if (/privacy|cookie|terms|voorwaarden|disclaimer|login|signin|signup|sign-up|account|cart|checkout|wp-admin|wp-json|xmlrpc|\/feed|\/tag\/|\/author\/|\/search/i.test(haystack)) continue
    const depth = path.split('/').filter(Boolean).length
    let score = depth === 1 ? 4 : depth === 2 ? 2 : 0
    if (/about|over-ons|over|bedrijf|company|team|pricing|prijzen|prijs|tarief|product|platform|feature|functie|oploss|solution|dienst|service|klant|customer|case|werkwijze|how-it-works|waarom|why|aanbod|pakket|integrat/i.test(haystack)) score += 8
    const previous = scored.get(url.href) ?? -1
    if (score > previous) scored.set(url.href, score)
  }
  return [...scored.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5).map(([href]) => href)
}

function formatPages(pages: PageCopy[]) {
  const budget = Math.max(3_500, Math.floor(28_000 / Math.max(pages.length, 1)))
  return pages.map((page) => {
    const parts = [
      `URL: ${page.finalUrl}`,
      page.title ? `Titel: ${page.title}` : '',
      page.description ? `Beschrijving: ${page.description}` : '',
      page.navigation.length ? `Navigatie: ${page.navigation.join(' · ')}` : '',
      page.headings.length ? `Koppen:\n${page.headings.map(item => `- ${item}`).join('\n')}` : '',
      page.jsonLd ? `Gestructureerde data:\n${page.jsonLd}` : '',
      page.text ? `Tekst:\n${page.text}` : '',
    ].filter(Boolean).join('\n')
    return parts.slice(0, budget)
  }).join('\n\n---\n\n')
}

async function downloadAsset(userId: string, brandId: string, assetUrl: string, baseUrl: string, source: string) {
  try {
    const url = new URL(assetUrl, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!response.ok) return null
    const mime = (response.headers.get('content-type') || 'application/octet-stream').split(';')[0] || 'application/octet-stream'
    if (!mime.startsWith('image/')) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length || bytes.length > 2_000_000) return null
    return await saveMedia({ userId, brandId, bytes, mime, source })
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
