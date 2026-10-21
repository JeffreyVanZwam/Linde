import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { deleteLibraryFile, findMedia } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const fileId = getRouterParam(event, 'id')
  if (!fileId) apiError(400, 'Bestand ontbreekt')
  const file = await findMedia(fileId)
  if (!file || file.userId !== user.id) apiError(404, 'Bestand niet gevonden')
  await deleteLibraryFile(file.id)
  return { ok: true }
})
