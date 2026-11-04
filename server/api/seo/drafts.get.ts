import { requireBrand } from '../../utils/scope'
import { listDrafts } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listDrafts(user.id, brand.id)
})
