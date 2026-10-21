import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { apiError, parseInput } from '../../../utils/http'
import { findFolder, findMedia, updateLibraryFile } from '../../../utils/store'

const schema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  folderId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const fileId = getRouterParam(event, 'id')
  if (!fileId) apiError(400, 'Bestand ontbreekt')
  const file = await findMedia(fileId)
  if (!file || file.userId !== user.id) apiError(404, 'Bestand niet gevonden')
  const input = parseInput(schema, await readBody(event))
  if (input.folderId && !await findFolder(input.folderId, user.id)) apiError(404, 'Map niet gevonden')
  await updateLibraryFile(file.id, input)
  return { ok: true }
})
