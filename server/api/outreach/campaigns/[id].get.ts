import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { findCampaign, listOutreachMessages, listRecipients, listSteps } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const campaignId = getRouterParam(event, 'id')
  if (!campaignId) apiError(400, 'Campagne ontbreekt')
  const campaign = await findCampaign(campaignId, user.id)
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  const [steps, recipients, messages] = await Promise.all([
    listSteps(campaign.id),
    listRecipients(campaign.id),
    listOutreachMessages(campaign.id),
  ])
  return { campaign, steps, recipients, messages }
})
