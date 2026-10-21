import { z } from 'zod'
import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { apiError } from '../http'
import { duplicateWarning } from '../similarity'
import { createPost, createTarget, deleteTargetsForPost, findMedia, findPost, listPosts, listSocialAccounts, listTargetsForPosts, updatePost } from '../store'

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

export async function listPostsForUser(userId: string) {
  const posts = await listPosts(userId)
  const targets = await listTargetsForPosts(posts.map(post => post.id))
  return posts.map(post => ({
    ...post,
    targets: targets.filter(target => target.postId === post.id),
  }))
}

export async function writePost(userId: string, input: z.infer<typeof postInputSchema>, postId?: string) {
  const accounts = await listSocialAccounts(userId)
  const media = input.mediaAssetId ? await findMedia(input.mediaAssetId) : null
  if (input.mediaAssetId && (!media || media.userId !== userId)) apiError(400, 'Media hoort niet bij deze gebruiker')
  const recent = await listPosts(userId, 40)
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
  const idToUse = postId || await createPost({
    userId,
    body: input.body,
    mediaAssetId: input.mediaAssetId || null,
    status: input.status,
    source: 'local',
    scheduledAt,
    duplicateWarning: warning,
  })
  if (postId) {
    const existing = await findPost(postId, userId)
    if (!existing || existing.source !== 'local') apiError(404, 'Post niet gevonden')
    await updatePost(postId, {
      body: input.body,
      mediaAssetId: input.mediaAssetId || null,
      status: input.status,
      scheduledAt,
      duplicateWarning: warning,
    })
    await deleteTargetsForPost(postId)
  }
  for (const target of prepared) {
    await createTarget({
      postId: idToUse,
      accountId: target.accountId,
      platform: target.platform,
      body: target.body,
      title: target.title,
      status: input.status,
    })
  }
  return { id: idToUse, duplicateWarning: warning }
}
