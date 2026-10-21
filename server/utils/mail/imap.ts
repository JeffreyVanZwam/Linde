import { ImapFlow } from 'imapflow'
import { decrypt } from '../crypto'
import { findSmtp } from '../store'

export async function hasReply(userId: string, fromEmail: string) {
  const smtp = await findSmtp(userId)
  if (!smtp?.imapHost || !smtp.imapPort) return false
  const client = new ImapFlow({
    host: smtp.imapHost,
    port: smtp.imapPort,
    secure: smtp.imapSecure ?? true,
    auth: { user: smtp.username, pass: decrypt(smtp.passwordEnc) },
    logger: false,
  })
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 21)
      const matches = await client.search({ from: fromEmail, since })
      return Array.isArray(matches) && matches.length > 0
    }
    finally {
      lock.release()
    }
  }
  finally {
    await client.logout().catch(() => undefined)
  }
}
