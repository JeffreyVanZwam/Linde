import { createPost, createTarget, findTargetByExternal, updateSocialAccount, updateTarget } from '../store'
import { readyAccount } from './accounts'
import { linkedinRecent } from './linkedin'
import { metaRecent } from './meta'
import { tiktokRecent } from './tiktok'
import type { RemotePost } from './types'
import { youtubeRecent } from './youtube'

export async function syncAccount(accountId: string) {
  const { row, account } = await readyAccount(accountId)
  let posts: RemotePost[] = []
  let warning: string | null = null
  try {
    if (account.platform === 'linkedin') posts = await linkedinRecent(account.accessToken, account.externalId)
    else if (account.platform === 'facebook' || account.platform === 'instagram') posts = await metaRecent(account)
    else if (account.platform === 'youtube') posts = await youtubeRecent(account.accessToken, account.meta?.uploadsPlaylistId || '')
    else if (account.platform === 'tiktok') posts = await tiktokRecent(account.accessToken)
  }
  catch (error) {
    warning = error instanceof Error ? error.message : 'Synchronisatie mislukte'
  }
  for (const post of posts) {
    const existing = await findTargetByExternal(row.id, post.externalId)
    if (existing) {
      await updateTarget(existing.id, {
        body: post.body,
        title: post.title || null,
        externalUrl: post.url || null,
        publishedAt: post.publishedAt || existing.publishedAt,
      })
      continue
    }
    const postId = await createPost({
      userId: row.userId,
      body: post.body,
      status: 'published',
      source: 'synced',
      scheduledAt: post.publishedAt || new Date(),
    })
    await createTarget({
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
  }
  await updateSocialAccount(row.id, { lastSyncAt: new Date() })
  return { imported: posts.length, warning }
}
