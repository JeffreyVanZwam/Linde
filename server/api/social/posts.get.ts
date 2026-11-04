import { requireBrand } from '../../utils/scope'
import { listPostsForUser } from '../../utils/social/posts'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listPostsForUser(user.id, brand.id)
})
