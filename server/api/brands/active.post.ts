import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { toBrandView } from '../../utils/brand'
import { apiError, parseInput } from '../../utils/http'
import { setActiveBrand } from '../../utils/store'

const schema = z.object({
  id: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const row = await setActiveBrand(user.id, input.id)
  if (!row) apiError(404, 'Merk niet gevonden')
  return toBrandView(row)
})
