import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { apiError, parseInput } from '../../../utils/http'
import { findCampaign, findOutreachMessage, updateOutreachMessage } from '../../../utils/store'

const schema = z.object({
  status: z.enum(['draft', 'approved', 'scheduled', 'cancelled']),
  scheduledAt: z.string().nullable().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const messageId = getRouterParam(event, 'id')
  if (!messageId) apiError(400, 'Bericht ontbreekt')
  const input = parseInput(schema, await readBody(event))
  const message = await findOutreachMessage(messageId)
  if (!message) apiError(404, 'Bericht niet gevonden')
  const campaign = await findCampaign(message.campaignId)
  if (!campaign || campaign.userId !== user.id) apiError(404, 'Bericht niet gevonden')
  if (message.status === 'sent') apiError(400, 'Verzonden berichten blijven staan')
  await updateOutreachMessage(message.id, {
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : message.scheduledAt,
    subject: input.subject ?? message.subject,
    body: input.body ?? message.body,
  })
  return { ok: true }
})
