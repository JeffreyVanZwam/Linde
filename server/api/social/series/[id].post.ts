import { requireBrand } from '../../../utils/scope'
import { approveSeriesItem } from '../../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  return approveSeriesItem(user.id, brand.id, id)
})
