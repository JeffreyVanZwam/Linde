import { z } from 'zod'
import { parseInput } from '../../utils/http'
import { requireBrand } from '../../utils/scope'
import { proofPost } from '../../utils/workshop'

const schema = z.object({
  author: z.string().trim().max(200).default(''),
  quote: z.string().trim().min(1).max(4000),
  source: z.string().trim().max(300).default(''),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  return proofPost({ userId: user.id, brand }, input)
})
