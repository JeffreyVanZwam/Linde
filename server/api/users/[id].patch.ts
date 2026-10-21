import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { updateManagedUser } from '../../utils/users'

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin', 'member']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Gebruiker ontbreekt' })
  const input = parseInput(schema, await readBody(event))
  return updateManagedUser(userId, input)
})
