import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { smtpConnections } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await useDb().query.smtpConnections.findFirst({ where: eq(smtpConnections.userId, user.id) })
  if (!row) return null
  return {
    host: row.host,
    port: row.port,
    secure: row.secure,
    username: row.username,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    imapHost: row.imapHost,
    imapPort: row.imapPort,
    imapSecure: row.imapSecure,
    hasPassword: true,
  }
})
