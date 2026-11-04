import { z } from 'zod'
import { parseInput } from '../../utils/http'
import { requireBrand } from '../../utils/scope'
import { pumpContent } from '../../utils/workshop'

const schema = z.object({
  text: z.string().trim().min(1).max(8000),
  url: z.string().max(2000).optional(),
  fileId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  return pumpContent({ userId: user.id, brand }, {
    text: input.text,
    url: input.url || undefined,
    fileId: input.fileId || undefined,
  })
})
