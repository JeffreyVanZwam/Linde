import { requireUser } from '../../utils/auth'
import { apiError } from '../../utils/http'
import { saveMedia } from '../../utils/media'
import { findFolder } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.data?.length)
  if (!file?.data) apiError(400, 'Bestand ontbreekt')
  if (file.data.length > 80_000_000) apiError(400, 'Bestand is te groot')
  const folderId = String(getQuery(event).folder || '')
  if (folderId && !await findFolder(folderId, user.id)) apiError(404, 'Map niet gevonden')
  const mime = file.type || 'application/octet-stream'
  const id = await saveMedia({
    userId: user.id,
    bytes: file.data,
    mime,
    source: 'upload',
    name: file.filename || undefined,
    folderId: folderId || null,
  })
  return { id }
})
