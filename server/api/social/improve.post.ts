import { z } from 'zod'
import { parseInput } from '../../utils/http'
import { requireBrand } from '../../utils/scope'
import { improveCaption } from '../../utils/workshop'

const schema = z.object({
  body: z.string().min(1).max(8000),
  instruction: z.string().min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  const text = await improveCaption({ userId: user.id, brand }, input.body, input.instruction)
  return { text }
})
