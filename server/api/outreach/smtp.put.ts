import { z } from 'zod'
import { requireBrand } from '../../utils/scope'
import { encrypt } from '../../utils/crypto'
import { parseInput } from '../../utils/http'
import { findSmtp, saveSmtp } from '../../utils/store'

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().int().optional(),
  imapSecure: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  const existing = await findSmtp(user.id, brand.id)
  if (!existing && !input.password) {
    throw createError({ statusCode: 400, statusMessage: 'Wachtwoord is verplicht' })
  }
  await saveSmtp(user.id, brand.id, existing, {
    host: input.host,
    port: input.port,
    secure: input.secure,
    username: input.username,
    passwordEnc: input.password ? encrypt(input.password) : existing!.passwordEnc,
    fromEmail: input.fromEmail,
    fromName: input.fromName || null,
    imapHost: input.imapHost || null,
    imapPort: input.imapPort || null,
    imapSecure: input.imapSecure ?? null,
  })
  return { ok: true }
})
