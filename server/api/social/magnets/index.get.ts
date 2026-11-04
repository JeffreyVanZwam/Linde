import { requireBrand } from '../../../utils/scope'
import { listLeadMagnets } from '../../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listLeadMagnets(user.id, brand.id)
})
