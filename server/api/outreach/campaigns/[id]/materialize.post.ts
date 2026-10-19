import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../../db/client'
import { outreachCampaigns, outreachMessages, outreachRecipients, outreachSteps } from '../../../../db/schema'
import { requireUser } from '../../../../utils/auth'
import { apiError, id } from '../../../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const campaignId = getRouterParam(event, 'id')
  if (!campaignId) apiError(400, 'Campagne ontbreekt')
  const db = useDb()
  const campaign = await db.query.outreachCampaigns.findFirst({
    where: and(eq(outreachCampaigns.id, campaignId), eq(outreachCampaigns.userId, user.id)),
  })
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  const steps = (await db.query.outreachSteps.findMany({ where: eq(outreachSteps.campaignId, campaign.id) }))
    .sort((a, b) => a.position - b.position)
  const recipients = await db.query.outreachRecipients.findMany({
    where: and(eq(outreachRecipients.campaignId, campaign.id), eq(outreachRecipients.status, 'active')),
  })
  const now = Date.now()
  const rows = []
  for (const recipient of recipients) {
    let delay = 0
    for (const step of steps) {
      delay += step.delayHours
      rows.push({
        id: id(),
        campaignId: campaign.id,
        recipientId: recipient.id,
        stepId: step.id,
        subject: step.subject,
        body: personalize(step.body, recipient.name, recipient.email),
        status: 'draft',
        scheduledAt: new Date(now + delay * 60 * 60 * 1000),
        createdAt: new Date(),
      })
    }
  }
  if (rows.length) await db.insert(outreachMessages).values(rows)
  await db.update(outreachCampaigns).set({ status: 'active', updatedAt: new Date() }).where(eq(outreachCampaigns.id, campaign.id))
  return { created: rows.length }
})

function personalize(body: string, name: string | null, email: string) {
  return body.replaceAll('{{name}}', name || email.split('@')[0] || '')
}
