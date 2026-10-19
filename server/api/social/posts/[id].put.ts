import { requireUser } from '../../../utils/auth'
import { parseInput } from '../../../utils/http'
import { postInputSchema, writePost } from '../../../utils/social/posts'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const postId = getRouterParam(event, 'id')
  const input = parseInput(postInputSchema, await readBody(event))
  return writePost(user.id, input, postId)
})
