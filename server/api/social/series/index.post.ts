import { z } from 'zod'
import { parseInput } from '../../../utils/http'
import { requireBrand } from '../../../utils/scope'
import { startSeries } from '../../../utils/workshop'

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  prompt: z.string().trim().min(1).max(4000),
  cadenceDays: z.coerce.number().int().min(1).max(30).default(1),
  lengthDays: z.coerce.number().int().min(2).max(14).default(5),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  return startSeries({ userId: user.id, brand }, input)
})
