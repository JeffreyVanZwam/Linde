import { z } from 'zod'
import { parseInput } from '../../../../utils/http'
import { requireBrand } from '../../../../utils/scope'
import { rewriteParagraph } from '../../../../utils/workshop'

const schema = z.object({
  quote: z.string().min(1).max(4000),
  instruction: z.string().min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  const input = parseInput(schema, await readBody(event))
  return rewriteParagraph({ userId: user.id, brand }, id, input.quote, input.instruction)
})
