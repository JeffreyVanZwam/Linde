import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { listBrandRows, reorderBrands } from '../../utils/store'

const schema = z.object({
  ids: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  await reorderBrands(user.id, input.ids)
  return listBrandRows(user.id)
})
