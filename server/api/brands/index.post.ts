import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { toBrandView } from '../../utils/brand'
import { parseInput } from '../../utils/http'
import { createBrandRow } from '../../utils/store'

const schema = z.object({
  companyName: z.string().trim().min(1).max(300),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const row = await createBrandRow(user.id, input.companyName)
  return toBrandView(row)
})
