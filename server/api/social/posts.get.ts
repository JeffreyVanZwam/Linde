import { requireUser } from '../../utils/auth'
import { listPostsForUser } from '../../utils/social/posts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listPostsForUser(user.id)
})
