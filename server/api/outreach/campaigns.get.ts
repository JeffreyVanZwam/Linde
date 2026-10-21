import { requireUser } from '../../utils/auth'
import { listCampaigns } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listCampaigns(user.id)
})
