import { requireUser } from '../../utils/auth'
import { findSmtp } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const row = await findSmtp(user.id)
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
