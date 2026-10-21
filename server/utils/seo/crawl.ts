import { replaceSiteArticles } from '../store'
import { articlesFromListing, isListingArticleUrl, isSitemapIndex, isSitemapUrl, sitemapLocations, titleFromPath, type ListingArticle } from './listing'

const MAX_ARTICLES = 80

export async function refreshArticles(userId: string, articlesUrl: string) {
  const root = new URL(articlesUrl)
  const response = await fetch(root, {
    signal: AbortSignal.timeout(12_000),
    headers: {
      'user-agent': 'MarketingDashboardBot/1.0',
      'accept': 'text/html',
    },
  })
  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'De artikelenpagina kon niet worden gelezen' })
  }
  const html = (await response.text()).slice(0, 2_000_000)
  const page = new URL(response.url)
  const pages = articlesFromListing(html, page.href)
  if (pages.size === 0) await collectFromSitemap(page, pages)

  const rows = [...pages.entries()].slice(0, MAX_ARTICLES).map(([url, article]) => ({
    url,
    title: article.title || url,
    excerpt: article.excerpt.slice(0, 280),
  }))
  if (rows.length) await replaceSiteArticles(userId, rows)
  else await replaceSiteArticles(userId, [])
  return rows.length
}

async function collectFromSitemap(page: URL, pages: Map<string, ListingArticle>) {
  const listing = normalizeListing(page)
  const queue = [new URL('/sitemap.xml', listing.origin).href]
  const seen = new Set<string>()
  while (queue.length && seen.size < 8 && pages.size < MAX_ARTICLES) {
    const sitemapUrl = queue.shift()
    if (!sitemapUrl || seen.has(sitemapUrl)) continue
    seen.add(sitemapUrl)
    let xml = ''
    try {
      const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(8_000) })
      if (!response.ok) continue
      xml = await response.text()
    }
    catch {
      continue
    }
    const locations = sitemapLocations(xml)
    if (isSitemapIndex(xml)) {
      for (const loc of locations) {
        if (isSitemapUrl(loc)) queue.push(loc)
      }
      continue
    }
    for (const loc of locations) {
      if (pages.size >= MAX_ARTICLES) return
      let next: URL
      try {
        next = normalizeListing(new URL(loc))
      }
      catch {
        continue
      }
      if (!isListingArticleUrl(listing, next) || pages.has(next.href)) continue
      pages.set(next.href, { title: titleFromPath(next.pathname), excerpt: '', fromHeading: false })
    }
  }
}

function normalizeListing(url: URL) {
  const next = new URL(url.href)
  next.hash = ''
  next.search = ''
  if (next.pathname.length > 1) next.pathname = next.pathname.replace(/\/+$/, '')
  return next
}
