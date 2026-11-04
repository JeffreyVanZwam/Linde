import { requireBrand } from '../../utils/scope'
import { suggestToday } from '../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return suggestToday({ userId: user.id, brand })
})
