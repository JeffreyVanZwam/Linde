import nodemailer from 'nodemailer'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { smtpConnections } from '../../db/schema'
import { decrypt, signValue } from '../crypto'
import { appBaseUrl } from '../http'

export async function sendOutreachMail(userId: string, message: { to: string, subject: string, body: string, recipientId: string }) {
  const footer = unsubscribeFooter(message.recipientId)
  const text = `${message.body}\n\n${footer.text}`
  const html = `<div>${escapeHtml(message.body).replaceAll('\n', '<br>')}</div><p style="color:#57534e;font-size:12px">${escapeHtml(footer.text)} <a href="${footer.url}">${footer.url}</a></p>`
  const smtp = await useDb().query.smtpConnections.findFirst({ where: eq(smtpConnections.userId, userId) })
  if (smtp) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.username, pass: decrypt(smtp.passwordEnc) },
    })
    const sent = await transporter.sendMail({
      from: smtp.fromName ? `"${smtp.fromName}" <${smtp.fromEmail}>` : smtp.fromEmail,
      to: message.to,
      subject: message.subject,
      text,
      html,
    })
    return sent.messageId
  }
  const config = useRuntimeConfig()
  if (!config.mailApiUrl || !config.mailApiKey) {
    throw new Error('Koppel SMTP of stel MAIL_API_URL en MAIL_API_KEY in')
  }
  const response = await fetch(config.mailApiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.mailApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'marketing@localhost',
      to: [message.to],
      subject: message.subject,
      text,
      html,
    }),
  })
  if (!response.ok) throw new Error(await response.text())
  const data = await response.json().catch(() => ({})) as { id?: string }
  return data.id || `api-${Date.now()}`
}

function unsubscribeFooter(recipientId: string) {
  const token = signValue(recipientId)
  const url = `${appBaseUrl()}/unsubscribe?id=${recipientId}&token=${token}`
  return {
    url,
    text: `Geen berichten meer ontvangen? Afmelden: ${url}`,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function unsubscribeToken(recipientId: string) {
  return signValue(recipientId)
}
