import { and, eq, gte, inArray } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { outreachCampaigns, outreachMessages, outreachRecipients } from '../../db/schema'
import { hasReply } from '../mail/imap'
import { sendOutreachMail } from '../mail/send'

export async function sendDueOutreach() {
  const limit = Number(useRuntimeConfig().outreachDailyLimit || 50)
  const db = useDb()
  const due = await db.query.outreachMessages.findMany({
    where: and(
      inArray(outreachMessages.status, ['approved', 'scheduled']),
      gte(outreachMessages.scheduledAt, new Date(0)),
    ),
  })
  const ready = due.filter(message => message.scheduledAt && message.scheduledAt.getTime() <= Date.now())
  let sent = 0
  for (const message of ready) {
    const recipient = await db.query.outreachRecipients.findFirst({
      where: eq(outreachRecipients.id, message.recipientId),
    })
    if (!recipient || recipient.status !== 'active') continue
    const campaign = await db.query.outreachCampaigns.findFirst({
      where: eq(outreachCampaigns.id, recipient.campaignId),
    })
    if (!campaign) continue
    const campaigns = await db.query.outreachCampaigns.findMany({
      where: eq(outreachCampaigns.userId, campaign.userId),
    })
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const sentToday = await db.query.outreachMessages.findMany({
      where: and(
        inArray(outreachMessages.campaignId, campaigns.map(item => item.id)),
        eq(outreachMessages.status, 'sent'),
        gte(outreachMessages.sentAt, start),
      ),
    })
    if (sentToday.length >= limit) continue
    try {
      if (await hasReply(campaign.userId, recipient.email)) {
        await db.update(outreachRecipients).set({ status: 'replied' }).where(eq(outreachRecipients.id, recipient.id))
        await db.update(outreachMessages).set({ status: 'cancelled' }).where(and(
          eq(outreachMessages.recipientId, recipient.id),
          inArray(outreachMessages.status, ['draft', 'approved', 'scheduled']),
        ))
        continue
      }
    }
    catch {
      // IMAP is optioneel.
    }
    try {
      const messageId = await sendOutreachMail(campaign.userId, {
        to: recipient.email,
        subject: message.subject,
        body: message.body,
        recipientId: recipient.id,
      })
      await db.update(outreachMessages).set({
        status: 'sent',
        sentAt: new Date(),
        messageId,
        error: null,
      }).where(eq(outreachMessages.id, message.id))
      sent += 1
    }
    catch (error) {
      await db.update(outreachMessages).set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Verzenden mislukte',
      }).where(eq(outreachMessages.id, message.id))
    }
  }
  return { sent }
}
