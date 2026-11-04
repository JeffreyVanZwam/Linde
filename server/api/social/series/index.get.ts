import { requireBrand } from '../../../utils/scope'
import { listSeries } from '../../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listSeries(user.id, brand.id)
})
