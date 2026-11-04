import { apiError } from '../../../utils/http'
import { deleteNote } from '../../../utils/knowledge'
import { requireBrand } from '../../../utils/scope'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  const removed = await deleteNote(id, user.id, brand.id)
  if (!removed) apiError(404, 'Notitie niet gevonden')
  return { ok: true }
})
