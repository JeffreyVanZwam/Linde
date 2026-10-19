import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { outreachCampaigns, outreachMessages, outreachRecipients, outreachSteps } from '../../../db/schema'
import { requireUser } from '../../../utils/auth'
import { apiError } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const campaignId = getRouterParam(event, 'id')
  if (!campaignId) apiError(400, 'Campagne ontbreekt')
  const db = useDb()
  const campaign = await db.query.outreachCampaigns.findFirst({
    where: and(eq(outreachCampaigns.id, campaignId), eq(outreachCampaigns.userId, user.id)),
  })
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  const [steps, recipients, messages] = await Promise.all([
    db.query.outreachSteps.findMany({ where: eq(outreachSteps.campaignId, campaign.id) }),
    db.query.outreachRecipients.findMany({ where: eq(outreachRecipients.campaignId, campaign.id) }),
    db.query.outreachMessages.findMany({ where: eq(outreachMessages.campaignId, campaign.id) }),
  ])
  return {
    campaign,
    steps: steps.sort((a, b) => a.position - b.position),
    recipients,
    messages,
  }
})
