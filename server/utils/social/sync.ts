import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { socialAccounts, socialPostTargets, socialPosts } from '../../db/schema'
import { id } from '../http'
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
  const db = useDb()
  for (const post of posts) {
    const existing = await db.query.socialPostTargets.findFirst({
      where: and(eq(socialPostTargets.accountId, row.id), eq(socialPostTargets.externalId, post.externalId)),
    })
    if (existing) {
      await db.update(socialPostTargets).set({
        body: post.body,
        title: post.title || null,
        externalUrl: post.url || null,
        publishedAt: post.publishedAt || existing.publishedAt,
      }).where(eq(socialPostTargets.id, existing.id))
      continue
    }
    const postId = id()
    const now = new Date()
    await db.insert(socialPosts).values({
      id: postId,
      userId: row.userId,
      body: post.body,
      status: 'published',
      source: 'synced',
      scheduledAt: post.publishedAt || now,
      createdAt: post.publishedAt || now,
      updatedAt: now,
    })
    await db.insert(socialPostTargets).values({
      id: id(),
      postId,
      accountId: row.id,
      platform: account.platform,
      body: post.body,
      title: post.title || null,
      status: 'published',
      externalId: post.externalId,
      externalUrl: post.url || null,
      publishedAt: post.publishedAt || now,
    })
  }
  await db.update(socialAccounts).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(socialAccounts.id, row.id))
  return { imported: posts.length, warning }
}
