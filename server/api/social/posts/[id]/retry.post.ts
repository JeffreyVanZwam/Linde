import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../../db/client'
import { socialPosts } from '../../../../db/schema'
import { requireUser } from '../../../../utils/auth'
import { apiError } from '../../../../utils/http'
import { publishPost } from '../../../../utils/social/publish'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const postId = getRouterParam(event, 'id')
  if (!postId) apiError(400, 'Post ontbreekt')
  const post = await useDb().query.socialPosts.findFirst({
    where: and(eq(socialPosts.id, postId), eq(socialPosts.userId, user.id)),
  })
  if (!post) apiError(404, 'Post niet gevonden')
  await useDb().update(socialPosts).set({ status: 'scheduled', scheduledAt: new Date() }).where(eq(socialPosts.id, post.id))
  await publishPost(post.id)
  return { ok: true }
})
