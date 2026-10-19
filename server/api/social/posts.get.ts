import { requireUser } from '../../utils/auth'
import { listPosts } from '../../utils/social/posts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listPosts(user.id)
})
