import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { createFolder, findFolder } from '../../utils/store'

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  if (input.parentId && !await findFolder(input.parentId, user.id)) apiError(404, 'Map niet gevonden')
  const id = await createFolder(user.id, input.name, input.parentId || null)
  return { id }
})
