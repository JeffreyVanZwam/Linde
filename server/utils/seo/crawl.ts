import * as cheerio from 'cheerio'
import { replaceSiteArticles } from '../store'

export async function refreshArticles(userId: string, articlesUrl: string) {
  const root = new URL(articlesUrl)
  const pages = new Map<string, { title: string, excerpt: string }>()
  await collect(root, pages)
  const sitemap = new URL('/sitemap.xml', root.origin)
  try {
    const response = await fetch(sitemap, { signal: AbortSignal.timeout(8_000) })
    if (response.ok) {
      const xml = await response.text()
      const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]).slice(0, 40)
      for (const loc of locs) {
        if (!loc || pages.has(loc)) continue
        try {
          await collect(new URL(loc), pages, true)
        }
        catch {
          continue
        }
      }
    }
  }
  catch {
    // Een ontbrekende sitemap is geen fout.
  }
  const rows = [...pages.entries()].slice(0, 80).map(([url, article]) => ({
    url,
    title: article.title || url,
    excerpt: article.excerpt.slice(0, 280),
  }))
  if (rows.length) await replaceSiteArticles(userId, rows)
  else await replaceSiteArticles(userId, [])
  return rows.length
}

async function collect(url: URL, pages: Map<string, { title: string, excerpt: string }>, single = false) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { 'user-agent': 'MarketingDashboardBot/1.0' },
  })
  if (!response.ok) return
  const html = (await response.text()).slice(0, 800_000)
  const $ = cheerio.load(html)
  const title = $('title').first().text().trim() || $('h1').first().text().trim()
  const excerpt = $('meta[name="description"]').attr('content') || $('p').first().text().replace(/\s+/g, ' ').trim()
  pages.set(response.url, { title, excerpt })
  if (single) return
  const links = $('a[href]')
    .map((_, element) => $(element).attr('href') || '')
    .get()
    .slice(0, 30)
  for (const href of links) {
    if (pages.size >= 40) return
    let next: URL
    try {
      next = new URL(href, response.url)
    }
    catch {
      continue
    }
    if (next.origin !== url.origin || pages.has(next.toString())) continue
    if (!/blog|artikel|article|nieuws|news|kennis|insights/i.test(next.pathname)) continue
    try {
      await collect(next, pages, true)
    }
    catch {
      continue
    }
  }
}
