import * as cheerio from 'cheerio'

const MAX_ARTICLES = 80

export type ListingArticle = { title: string, excerpt: string, fromHeading: boolean }

export function articlesFromListing(html: string, pageUrl: string) {
  const page = normalizeUrl(new URL(pageUrl))
  const $ = cheerio.load(html)
  const pages = new Map<string, ListingArticle>()

  $('a[href]').each((_, element) => {
    if (pages.size >= MAX_ARTICLES) return false
    const href = $(element).attr('href') || ''
    const next = resolveLink(href, page)
    if (!next || next.origin !== page.origin || next.href === page.href) return
    if (!isChildPath(page.pathname, next.pathname) || isAsset(next.pathname)) return

    const scope = $(element).closest('article')
    const card = scope.length ? scope : $(element)
    const title = clean(card.find('h1, h2, h3, h4').first().text())
    const excerpt = clean(card.find('p').first().text())
    const fromHeading = title.length > 1
    const fallback = clean($(element).text()).slice(0, 180)
    const resolved = fromHeading ? title : fallback
    if (!isArticleTitle(resolved)) return
    remember(pages, next.href, {
      title: resolved,
      excerpt: excerpt.slice(0, 280),
      fromHeading,
    })
  })

  return pages
}

export function isListingArticleUrl(page: URL, candidate: URL) {
  const listingPath = pathOf(page)
  const pathname = pathOf(candidate)
  if (candidate.origin !== page.origin || pathname === listingPath) return false
  if (isAsset(pathname) || isSitemapUrl(candidate.href)) return false
  if (listingPath !== '/' && isChildPath(listingPath, pathname)) return true
  return listingPath === '/' && isArticlePath(pathname)
}

export function titleFromPath(pathname: string) {
  const slug = pathname.split('/').filter(Boolean).at(-1) || pathname
  return decodeURIComponent(slug).replace(/[-_]+/g, ' ')
}

export function sitemapLocations(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => decodeXml(match[1].trim()))
}

export function isSitemapIndex(xml: string) {
  return /<sitemapindex[\s>]/i.test(xml)
}

export function isSitemapUrl(url: string) {
  return /\.xml($|\?)/i.test(url) || url.includes('/__sitemap__/')
}

function remember(pages: Map<string, ListingArticle>, url: string, article: ListingArticle) {
  const current = pages.get(url)
  if (current?.fromHeading && !article.fromHeading) return
  if (current && !article.fromHeading) return
  pages.set(url, article)
}

function resolveLink(href: string, page: URL) {
  if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return null
  try {
    return normalizeUrl(new URL(href, page.href))
  }
  catch {
    return null
  }
}

function normalizeUrl(url: URL) {
  const next = new URL(url.href)
  next.hash = ''
  next.search = ''
  next.pathname = pathOf(next)
  return next
}

function pathOf(url: URL) {
  if (url.pathname.length > 1) return url.pathname.replace(/\/+$/, '')
  return url.pathname
}

function isChildPath(listingPath: string, pathname: string) {
  return listingPath !== '/' && pathname.startsWith(`${listingPath}/`)
}

function isAsset(pathname: string) {
  return /\.(?:xml|json|css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|pdf|woff2?|mp4|webm|zip)$/i.test(pathname)
    || pathname.startsWith('/_nuxt/')
    || pathname.includes('/__sitemap__/')
}

function isArticlePath(pathname: string) {
  return /\/(?:blog|artikel|article|nieuws|news|kennis|insights)(?:\/|$)/i.test(pathname)
}

function isArticleTitle(title: string) {
  if (title.length < 3 || title.length > 180) return false
  return !/^(lees artikel|lees meer|read more|meer lezen)$/i.test(title)
}

function decodeXml(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
