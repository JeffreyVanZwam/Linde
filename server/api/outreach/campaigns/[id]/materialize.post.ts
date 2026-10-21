import { requireUser } from '../../../../utils/auth'
import { apiError } from '../../../../utils/http'
import { createOutreachMessages, findCampaign, listRecipients, listSteps, updateCampaign } from '../../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const campaignId = getRouterParam(event, 'id')
  if (!campaignId) apiError(400, 'Campagne ontbreekt')
  const campaign = await findCampaign(campaignId, user.id)
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  const steps = await listSteps(campaign.id)
  const recipients = await listRecipients(campaign.id, 'active')
  const now = Date.now()
  const rows = []
  for (const recipient of recipients) {
    let delay = 0
    for (const step of steps) {
      delay += step.delayHours
      rows.push({
        campaignId: campaign.id,
        recipientId: recipient.id,
        stepId: step.id,
        subject: step.subject,
        body: personalize(step.body, recipient.name, recipient.email),
        status: 'draft',
        scheduledAt: new Date(now + delay * 60 * 60 * 1000),
      })
    }
  }
  if (rows.length) await createOutreachMessages(rows)
  await updateCampaign(campaign.id, { status: 'active' })
  return { created: rows.length }
})

function personalize(body: string, name: string | null, email: string) {
  return body.replaceAll('{{name}}', name || email.split('@')[0] || '')
}
