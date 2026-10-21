import { hasReply } from '../mail/imap'
import { sendOutreachMail } from '../mail/send'
import { cancelOpenMessages, findCampaign, findRecipient, listActionableOutreach, listCampaigns, listSentSince, updateOutreachMessage, updateRecipient } from '../store'

export async function sendDueOutreach() {
  const limit = Number(useRuntimeConfig().outreachDailyLimit || 50)
  const ready = await listActionableOutreach()
  let sent = 0
  for (const message of ready) {
    const recipient = await findRecipient(message.recipientId)
    if (!recipient || recipient.status !== 'active') continue
    const campaign = await findCampaign(recipient.campaignId)
    if (!campaign) continue
    const campaigns = await listCampaigns(campaign.userId)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const sentToday = await listSentSince(campaigns.map(item => item.id), start)
    if (sentToday.length >= limit) continue
    try {
      if (await hasReply(campaign.userId, recipient.email)) {
        await updateRecipient(recipient.id, { status: 'replied' })
        await cancelOpenMessages(recipient.id)
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
      await updateOutreachMessage(message.id, {
        status: 'sent',
        sentAt: new Date(),
        messageId,
        error: null,
      })
      sent += 1
    }
    catch (error) {
      await updateOutreachMessage(message.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Verzenden mislukte',
      })
    }
  }
  return { sent }
}
