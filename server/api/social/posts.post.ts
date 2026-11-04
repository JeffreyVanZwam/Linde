import { requireBrand } from '../../utils/scope'
import { parseInput } from '../../utils/http'
import { postInputSchema, writePost } from '../../utils/social/posts'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(postInputSchema, await readBody(event))
  return writePost(user.id, brand.id, input)
})
