import { listPosts, listSocialAccounts, listTargetsForPosts } from '../store'
import { engagementRate, interactionCount, labelById, type PerformanceLabel } from './performance'

export async function recentPerformance(userId: string, brandId: string) {
  const accounts = await listSocialAccounts(userId, brandId)
  const posts = await listPosts(userId, brandId, 200)
  const targets = await listTargetsForPosts(posts.map(post => post.id))
  const labels = labelById(targets)
  return accounts.map(account => ({
    platform: account.platform,
    account: account.displayName,
    posts: targets
      .filter(target => target.accountId === account.id && target.status === 'published')
      .sort((left, right) => (right.publishedAt?.getTime() || 0) - (left.publishedAt?.getTime() || 0))
      .slice(0, 5)
      .map(target => ({
        body: target.body.replace(/\s+/g, ' ').slice(0, 280),
        publishedAt: target.publishedAt?.toISOString() || null,
        label: (labels.get(target.id) || 'unknown') as PerformanceLabel,
        impressions: target.impressions,
        interactions: interactionCount(target),
        rate: engagementRate(target),
      })),
  })).filter(account => account.posts.length > 0)
}

export async function socialBrief(userId: string, brandId: string, locale: 'nl' | 'en') {
  const accounts = await recentPerformance(userId, brandId)
  const dutch = locale !== 'en'
  const rules = dutch
    ? 'Beoordeel elk account apart. Volg wat op dit account sterk presteert. Herhaal een zwakke invalshoek niet op hetzelfde account. Een zwak resultaat op het ene platform zegt niets over een ander platform. Plaats geen bijna-identieke tekst opnieuw op hetzelfde account.'
    : 'Judge each account on its own. Follow what performs strongly on that account. Do not repeat a weak angle on the same account. A weak result on one platform says nothing about another platform. Do not post near-duplicate text on the same account again.'
  if (!accounts.length) {
    return dutch
      ? `${rules}\n\nEr zijn nog geen geplaatste posts om op te bouwen.`
      : `${rules}\n\nThere are no published posts to learn from yet.`
  }
  const names: Record<PerformanceLabel, string> = dutch
    ? { strong: 'sterk', average: 'gemiddeld', weak: 'zwak', unknown: 'onbekend' }
    : { strong: 'strong', average: 'average', weak: 'weak', unknown: 'unknown' }
  const lines = [rules, '', dutch ? 'Geplaatste posts per account:' : 'Published posts per account:']
  for (const account of accounts) {
    lines.push(`${account.platform} · ${account.account}:`)
    for (const post of account.posts) {
      const bits = [names[post.label]]
      if (post.rate != null) bits.push(percent(post.rate, dutch))
      if (post.impressions != null) bits.push(`${post.impressions} ${dutch ? 'impressies' : 'impressions'}`)
      else if (post.interactions > 0) bits.push(`${post.interactions} ${dutch ? 'interacties' : 'interactions'}`)
      lines.push(`- ${bits.join(', ')}: ${post.body}`)
    }
  }
  return lines.join('\n')
}

function percent(rate: number, dutch: boolean) {
  const text = `${(rate * 100).toFixed(1)}%`
  return dutch ? text.replace('.', ',') : text
}
