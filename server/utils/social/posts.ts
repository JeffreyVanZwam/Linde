import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { useDb } from '../../db/client'
import { mediaAssets, socialAccounts, socialPostTargets, socialPosts } from '../../db/schema'
import { apiError, id } from '../http'
import { duplicateWarning } from '../similarity'

export const postInputSchema = z.object({
  body: z.string().max(8000).default(''),
  mediaAssetId: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(['draft', 'scheduled']).default('draft'),
  targets: z.array(z.object({
    accountId: z.string(),
    body: z.string(),
    title: z.string().optional(),
  })).min(1),
})

export async function listPosts(userId: string) {
  const db = useDb()
  const posts = await db.query.socialPosts.findMany({
    where: eq(socialPosts.userId, userId),
    orderBy: desc(socialPosts.createdAt),
    limit: 500,
  })
  const ids = posts.map(post => post.id)
  const targets = ids.length
    ? await db.select().from(socialPostTargets).where(inArray(socialPostTargets.postId, ids))
    : []
  return posts.map(post => ({
    ...post,
    targets: targets.filter(target => target.postId === post.id),
  }))
}

export async function writePost(userId: string, input: z.infer<typeof postInputSchema>, postId?: string) {
  const db = useDb()
  const accounts = await db.query.socialAccounts.findMany({ where: eq(socialAccounts.userId, userId) })
  const media = input.mediaAssetId
    ? await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, input.mediaAssetId) })
    : null
  if (input.mediaAssetId && (!media || media.userId !== userId)) apiError(400, 'Media hoort niet bij deze gebruiker')
  const recent = await db.query.socialPosts.findMany({
    where: eq(socialPosts.userId, userId),
    orderBy: desc(socialPosts.createdAt),
    limit: 40,
  })
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  if (input.status === 'scheduled' && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    apiError(400, 'Kies een datum om in te plannen')
  }
  const prepared = input.targets.map((target) => {
    const account = accounts.find(item => item.id === target.accountId)
    if (!account) apiError(400, 'Onbekend social account')
    const platform = account.platform as SocialPlatform
    const rule = platformLimits[platform]
    if (rule.requires === 'image' && media?.kind !== 'image') apiError(400, `${platform} heeft een afbeelding nodig`)
    if (rule.requires === 'video' && media?.kind !== 'video') apiError(400, `${platform} heeft een video nodig`)
    return {
      accountId: account.id,
      platform,
      body: target.body.slice(0, rule.body),
      title: target.title?.slice(0, rule.title || 150) || null,
    }
  })
  const warning = duplicateWarning(input.body, recent.filter(post => post.id !== postId).map(post => post.body))
  const now = new Date()
  const idToUse = postId || id()
  if (postId) {
    const existing = await db.query.socialPosts.findFirst({
      where: and(eq(socialPosts.id, postId), eq(socialPosts.userId, userId)),
    })
    if (!existing || existing.source !== 'local') apiError(404, 'Post niet gevonden')
    await db.update(socialPosts).set({
      body: input.body,
      mediaAssetId: input.mediaAssetId || null,
      status: input.status,
      scheduledAt,
      duplicateWarning: warning,
      updatedAt: now,
    }).where(eq(socialPosts.id, postId))
    await db.delete(socialPostTargets).where(eq(socialPostTargets.postId, postId))
  }
  else {
    await db.insert(socialPosts).values({
      id: idToUse,
      userId,
      body: input.body,
      mediaAssetId: input.mediaAssetId || null,
      status: input.status,
      source: 'local',
      scheduledAt,
      duplicateWarning: warning,
      createdAt: now,
      updatedAt: now,
    })
  }
  if (prepared.length) {
    await db.insert(socialPostTargets).values(prepared.map(target => ({
      id: id(),
      postId: idToUse,
      accountId: target.accountId,
      platform: target.platform,
      body: target.body,
      title: target.title,
      status: input.status,
    })))
  }
  return { id: idToUse, duplicateWarning: warning }
}
