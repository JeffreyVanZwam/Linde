import { z } from 'zod'
import { requireUser } from '../../../utils/auth'
import { decrypt } from '../../../utils/crypto'
import { apiError, parseInput } from '../../../utils/http'
import { verifyImap, verifySmtp } from '../../../utils/mail/verify'
import { findSmtp } from '../../../utils/store'

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().int().optional(),
  imapSecure: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const existing = await findSmtp(user.id)

  const password = input.password || (existing ? decrypt(existing.passwordEnc) : '')
  if (!password) {
    apiError(400, 'Wachtwoord is verplicht')
  }

  try {
    await verifySmtp({
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      password,
    })

    if (input.imapHost && input.imapPort) {
      await verifyImap({
        host: input.imapHost,
        port: input.imapPort,
        secure: input.imapSecure ?? true,
        username: input.username,
        password,
      })
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Verbinding mislukt'
    apiError(400, message)
  }

  return { ok: true }
})
