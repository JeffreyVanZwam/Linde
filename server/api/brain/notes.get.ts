import { requireBrand } from '../../utils/scope'
import { listNotes } from '../../utils/knowledge'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listNotes(user.id, brand.id)
})
