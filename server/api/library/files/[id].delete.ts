import { requireBrand } from '../../../utils/scope'
import { apiError } from '../../../utils/http'
import { deleteLibraryFile, findMedia } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const fileId = getRouterParam(event, 'id')
  if (!fileId) apiError(400, 'Bestand ontbreekt')
  const file = await findMedia(fileId)
  if (!file || file.userId !== user.id || file.brandId !== brand.id) apiError(404, 'Bestand niet gevonden')
  await deleteLibraryFile(file.id)
  return { ok: true }
})
