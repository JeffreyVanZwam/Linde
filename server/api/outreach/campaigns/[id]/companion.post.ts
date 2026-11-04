import { apiError } from '../../../../utils/http'
import { requireBrand } from '../../../../utils/scope'
import { findCampaign } from '../../../../utils/store'
import { companionForCampaign } from '../../../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  const campaign = await findCampaign(id, user.id, brand.id)
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  return companionForCampaign({ userId: user.id, brand }, campaign)
})
