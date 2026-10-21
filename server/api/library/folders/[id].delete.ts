import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { deleteFolder, findFolder } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const folderId = getRouterParam(event, 'id')
  if (!folderId) apiError(400, 'Map ontbreekt')
  const folder = await findFolder(folderId, user.id)
  if (!folder) apiError(404, 'Map niet gevonden')
  await deleteFolder(folder.id)
  return { ok: true }
})
