import { z } from 'zod'
import { parseInput } from '../../utils/http'
import { requireBrand } from '../../utils/scope'
import { smartReplies } from '../../utils/workshop'

const schema = z.object({
  text: z.string().trim().min(1).max(4000),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  return { replies: await smartReplies({ userId: user.id, brand }, input.text) }
})
