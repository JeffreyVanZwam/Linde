import { requireUser } from '../../../../utils/auth'
import { apiError } from '../../../../utils/http'
import { publishPost } from '../../../../utils/social/publish'
import { findPost, updatePost } from '../../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const postId = getRouterParam(event, 'id')
  if (!postId) apiError(400, 'Post ontbreekt')
  const post = await findPost(postId, user.id)
  if (!post) apiError(404, 'Post niet gevonden')
  await updatePost(post.id, { status: 'scheduled', scheduledAt: new Date() })
  await publishPost(post.id)
  return { ok: true }
})
