import { z } from 'zod'
import { parseInput } from '../../../utils/http'
import { requireBrand } from '../../../utils/scope'
import { buildLeadMagnet } from '../../../utils/workshop'

const schema = z.object({
  problem: z.string().trim().min(1).max(2000),
  kind: z.enum(['checklist', 'guide']),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  return buildLeadMagnet({ userId: user.id, brand }, input)
})
