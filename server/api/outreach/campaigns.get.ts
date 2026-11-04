import { requireBrand } from '../../utils/scope'
import { listCampaigns } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listCampaigns(user.id, brand.id)
})
