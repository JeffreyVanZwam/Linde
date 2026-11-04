import { createPost, createTarget, findPost, findTargetByExternal, updatePost, updateSocialAccount, updateTarget } from '../store'
import { readyAccount } from './accounts'
import { linkedinRecent } from './linkedin'
import { metricPatch, refreshAccountMetrics } from './metrics'
import { metaRecent } from './meta'
import { pinterestRecent } from './pinterest'
import { tiktokRecent } from './tiktok'
import { xRecent } from './x'
import type { RemotePost } from './types'
import { youtubeRecent } from './youtube'

export async function syncAccount(accountId: string) {
  const { row, account } = await readyAccount(accountId)
  let posts: RemotePost[] = []
  let warning: string | null = null
  try {
    if (account.platform === 'linkedin') posts = await linkedinRecent(account.accessToken, account.externalId, account.meta?.authorType)
    else if (account.platform === 'facebook' || account.platform === 'instagram') posts = await metaRecent(account)
    else if (account.platform === 'youtube') posts = await youtubeRecent(account.accessToken, account.meta?.uploadsPlaylistId || '')
    else if (account.platform === 'tiktok') posts = await tiktokRecent(account.accessToken)
    else if (account.platform === 'x') posts = await xRecent(account.accessToken, account.externalId)
    else if (account.platform === 'pinterest') posts = await pinterestRecent(account.accessToken)
  }
  catch (error) {
    warning = error instanceof Error ? error.message : 'Synchronisatie mislukte'
  }
  for (const post of posts) {
    const existing = await findTargetByExternal(row.id, post.externalId)
    if (existing) {
      const publishedAt = post.publishedAt || existing.publishedAt
      const metrics = metricsOf(post)
      await updateTarget(existing.id, {
        body: post.body,
        title: post.title || null,
        externalUrl: post.url || null,
        publishedAt,
        ...(metrics || {}),
      })
      const parent = await findPost(existing.postId)
      if (parent?.source === 'synced' && (publishedAt || post.imageUrl)) {
        await updatePost(parent.id, {
          ...(publishedAt ? { scheduledAt: publishedAt } : {}),
          ...(post.imageUrl ? { imageUrl: post.imageUrl } : {}),
        })
      }
      continue
    }
    const postId = await createPost({
      userId: row.userId,
      brandId: row.brandId,
      body: post.body,
      imageUrl: post.imageUrl || null,
      status: 'published',
      source: 'synced',
      scheduledAt: post.publishedAt || new Date(),
    })
    const targetId = await createTarget({
      postId,
      accountId: row.id,
      platform: account.platform,
      body: post.body,
      title: post.title || null,
      status: 'published',
      externalId: post.externalId,
      externalUrl: post.url || null,
      publishedAt: post.publishedAt || new Date(),
    })
    const metrics = metricsOf(post)
    if (metrics) await updateTarget(targetId, metrics)
  }
  try {
    const metricsWarning = await refreshAccountMetrics(accountId)
    if (metricsWarning) warning = [warning, metricsWarning].filter(Boolean).join(' ')
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Cijfers ophalen mislukte'
    warning = [warning, message].filter(Boolean).join(' ')
  }
  await updateSocialAccount(row.id, { lastSyncAt: new Date() })
  return { imported: posts.length, warning }
}

function metricsOf(post: RemotePost) {
  return post.metrics ? metricPatch(post.metrics) : null
}
