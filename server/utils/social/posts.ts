import { z } from 'zod'
import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { apiError } from '../http'
import { duplicateWarning } from '../similarity'
import { createPost, createTarget, deleteTargetsForPost, findMedia, findPost, listMedia, listPosts, listSocialAccounts, listTargetsForPosts, updatePost } from '../store'
import { labelById } from './performance'

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

export async function listPostsForUser(userId: string, brandId: string) {
  const posts = await listPosts(userId, brandId)
  const targets = await listTargetsForPosts(posts.map(post => post.id))
  const labels = labelById(targets)
  const corpus = targets.filter(target => target.status === 'published' || target.status === 'scheduled')
  const mediaRows = await listMedia(posts.flatMap(post => post.mediaAssetId ? [post.mediaAssetId] : []))
  const mediaById = new Map(mediaRows.map(row => [row.id, row]))
  return posts.map((post) => {
    const media = post.mediaAssetId ? mediaById.get(post.mediaAssetId) : undefined
    return {
      ...post,
      media: media && (media.kind === 'image' || media.kind === 'video')
        ? { id: media.id, kind: media.kind }
        : null,
      targets: targets.filter(target => target.postId === post.id).map(target => ({
        ...target,
        performance: labels.get(target.id) || 'unknown',
        duplicateWarning: target.accountId
          ? duplicateWarning(target.body, corpus.filter(other => other.id !== target.id && other.accountId === target.accountId).map(other => other.body))
          : null,
      })),
    }
  })
}

export async function comparableTargets(userId: string, brandId: string, exceptPostId?: string) {
  const posts = await listPosts(userId, brandId, 80)
  const targets = await listTargetsForPosts(posts.map(post => post.id))
  return targets.filter(target =>
    target.accountId
    && target.postId !== exceptPostId
    && (target.status === 'published' || target.status === 'scheduled'),
  )
}

export function accountDuplicate(body: string, accountId: string, corpus: Array<{ accountId: string | null, body: string }>) {
  return duplicateWarning(body, corpus.filter(item => item.accountId === accountId).map(item => item.body))
}

export async function writePost(userId: string, brandId: string, input: z.infer<typeof postInputSchema>, postId?: string) {
  const accounts = await listSocialAccounts(userId, brandId)
  const media = input.mediaAssetId ? await findMedia(input.mediaAssetId) : null
  if (input.mediaAssetId && (!media || media.userId !== userId || media.brandId !== brandId)) apiError(400, 'Media hoort niet bij dit merk')
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
  if (input.status === 'scheduled' && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    apiError(400, 'Kies een datum om in te plannen')
  }
  const corpus = await comparableTargets(userId, brandId, postId)
  const prepared = input.targets.map((target) => {
    const account = accounts.find(item => item.id === target.accountId)
    if (!account) apiError(400, 'Onbekend social account')
    const platform = account.platform as SocialPlatform
    const rule = platformLimits[platform]
    if (rule.requires === 'image' && media?.kind !== 'image') apiError(400, `${platform} heeft een afbeelding nodig`)
    if (rule.requires === 'video' && media?.kind !== 'video') apiError(400, `${platform} heeft een video nodig`)
    const body = target.body.slice(0, rule.body)
    const duplicate = accountDuplicate(body, account.id, corpus)
    const blocked = input.status === 'scheduled' && Boolean(duplicate)
    return {
      accountId: account.id,
      platform,
      body,
      title: target.title?.slice(0, rule.title || 150) || null,
      duplicateWarning: duplicate,
      status: blocked ? 'draft' as const : input.status,
    }
  })
  const warning = prepared.map(target => target.duplicateWarning).filter((item): item is string => Boolean(item)).join('\n') || null
  const postStatus = prepared.some(target => target.status === 'scheduled') ? 'scheduled' : input.status === 'scheduled' ? 'draft' : input.status
  const idToUse = postId || await createPost({
    userId,
    brandId,
    body: input.body,
    mediaAssetId: input.mediaAssetId || null,
    status: postStatus,
    source: 'local',
    scheduledAt,
    duplicateWarning: warning,
  })
  if (postId) {
    const existing = await findPost(postId, userId, brandId)
    if (!existing || existing.source !== 'local') apiError(404, 'Post niet gevonden')
    await updatePost(postId, {
      body: input.body,
      mediaAssetId: input.mediaAssetId || null,
      status: postStatus,
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
      status: target.status,
    })
  }
  return {
    id: idToUse,
    duplicateWarning: warning,
    targets: prepared.map(target => ({
      accountId: target.accountId,
      platform: target.platform,
      status: target.status,
      duplicateWarning: target.duplicateWarning,
    })),
  }
}
