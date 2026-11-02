import { listAllSocialAccounts, listTargetsForAccount, updateTarget } from '../store'
import { readyAccount } from './accounts'
import { linkedinMetrics } from './linkedin'
import { metaMetrics } from './meta'
import { tiktokMetrics } from './tiktok'
import type { PostMetrics } from './types'
import { youtubeMetrics } from './youtube'

const metricKeys = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks'] as const

export function metricPatch(metrics: PostMetrics) {
  const patch: Partial<Record<(typeof metricKeys)[number], number>> & { metricsAt?: Date } = {}
  for (const key of metricKeys) {
    const value = metrics[key]
    if (value != null) patch[key] = value
  }
  if (!Object.keys(patch).length) return null
  return { ...patch, metricsAt: new Date() }
}

export async function refreshAccountMetrics(accountId: string) {
  const { account } = await readyAccount(accountId)
  if (account.platform === 'linkedin' && account.meta?.authorType !== 'organization') return null
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const targets = (await listTargetsForAccount(accountId))
    .filter(target => target.status === 'published' && target.externalId && target.publishedAt && target.publishedAt.getTime() >= cutoff)
    .sort((left, right) => (right.publishedAt?.getTime() || 0) - (left.publishedAt?.getTime() || 0))
    .slice(0, 40)
  if (!targets.length) return null
  const ids = targets.map(target => target.externalId).filter((id): id is string => Boolean(id))
  const result = account.platform === 'linkedin'
    ? await linkedinMetrics(account.accessToken, account.externalId, ids)
    : account.platform === 'facebook' || account.platform === 'instagram'
      ? await metaMetrics(account, ids)
      : account.platform === 'youtube'
        ? await youtubeMetrics(account.accessToken, ids)
        : account.platform === 'tiktok'
          ? await tiktokMetrics(account.accessToken, ids)
          : null
  if (!result) return null
  for (const target of targets) {
    const metrics = target.externalId ? result.metrics.get(target.externalId) : null
    const patch = metrics ? metricPatch(metrics) : null
    if (patch) await updateTarget(target.id, patch)
  }
  return result.warning
}

export async function refreshRecentMetrics() {
  const accounts = await listAllSocialAccounts()
  const warnings: string[] = []
  for (const account of accounts) {
    try {
      const warning = await refreshAccountMetrics(account.id)
      if (warning) warnings.push(warning)
    }
    catch (error) {
      warnings.push(error instanceof Error ? error.message.slice(0, 240) : 'Cijfers ophalen mislukte')
    }
  }
  return { accounts: accounts.length, warnings }
}
