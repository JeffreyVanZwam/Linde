import { and, eq, lte } from 'drizzle-orm'
import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { useDb } from '../../db/client'
import { mediaAssets, socialPostTargets, socialPosts } from '../../db/schema'
import { readyAccount } from './accounts'
import { linkedinPublish } from './linkedin'
import { metaPublish } from './meta'
import { tiktokPublish } from './tiktok'
import type { PublishInput } from './types'
import { youtubePublish } from './youtube'

export async function publishDuePosts() {
  const due = await useDb().query.socialPosts.findMany({
    where: and(eq(socialPosts.status, 'scheduled'), lte(socialPosts.scheduledAt, new Date())),
  })
  for (const post of due) {
    await publishPost(post.id)
  }
  return { published: due.length }
}

export async function publishPost(postId: string) {
  const db = useDb()
  const post = await db.query.socialPosts.findFirst({ where: eq(socialPosts.id, postId) })
  if (!post || post.source !== 'local') return
  await db.update(socialPosts).set({ status: 'publishing', updatedAt: new Date() }).where(eq(socialPosts.id, post.id))
  const targets = await db.query.socialPostTargets.findMany({ where: eq(socialPostTargets.postId, post.id) })
  const media = post.mediaAssetId
    ? await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, post.mediaAssetId) })
    : null
  let failed = false
  for (const target of targets) {
    if (target.status === 'published') continue
    if (!target.accountId) {
      failed = true
      await db.update(socialPostTargets).set({ status: 'failed', error: 'Geen gekoppeld account' }).where(eq(socialPostTargets.id, target.id))
      continue
    }
    try {
      const { account } = await readyAccount(target.accountId)
      const input: PublishInput = {
        body: target.body,
        title: target.title,
        image: media?.kind === 'image' ? { path: media.path, mime: media.mime } : null,
        video: media?.kind === 'video' ? { path: media.path, mime: media.mime } : null,
      }
      assertMedia(account.platform, input)
      const result = await publishTo(account, input, media?.id || null)
      await db.update(socialPostTargets).set({
        status: 'published',
        externalId: result.externalId,
        externalUrl: result.url || null,
        error: null,
        publishedAt: new Date(),
      }).where(eq(socialPostTargets.id, target.id))
    }
    catch (error) {
      failed = true
      await db.update(socialPostTargets).set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Publiceren mislukte',
      }).where(eq(socialPostTargets.id, target.id))
    }
  }
  await db.update(socialPosts).set({
    status: failed ? 'failed' : 'published',
    updatedAt: new Date(),
  }).where(eq(socialPosts.id, post.id))
}

function assertMedia(platform: SocialPlatform, input: PublishInput) {
  const rule = platformLimits[platform]
  if (rule.requires === 'image' && !input.image) throw new Error(`${platform} heeft een afbeelding nodig`)
  if (rule.requires === 'video' && !input.video) throw new Error(`${platform} heeft een video nodig`)
}

async function publishTo(account: Awaited<ReturnType<typeof readyAccount>>['account'], input: PublishInput, mediaId: string | null) {
  if (account.platform === 'linkedin') return linkedinPublish(account.accessToken, account.externalId, input)
  if (account.platform === 'facebook' || account.platform === 'instagram') return metaPublish(account, input, mediaId)
  if (account.platform === 'youtube') return youtubePublish(account.accessToken, input)
  if (account.platform === 'tiktok') return tiktokPublish(account.accessToken, input)
  throw new Error('Onbekend platform')
}
