import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { createManagedUser } from '../../utils/users'

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(['admin', 'member']).default('member'),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = parseInput(schema, await readBody(event))
  return createManagedUser(input)
})
