import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/client'
import { smtpConnections } from '../../db/schema'
import { requireUser } from '../../utils/auth'
import { encrypt } from '../../utils/crypto'
import { id, parseInput } from '../../utils/http'

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
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const db = useDb()
  const existing = await db.query.smtpConnections.findFirst({ where: eq(smtpConnections.userId, user.id) })
  if (!existing && !input.password) {
    throw createError({ statusCode: 400, statusMessage: 'Wachtwoord is verplicht' })
  }
  const now = new Date()
  const values = {
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
    updatedAt: now,
  }
  if (existing) await db.update(smtpConnections).set(values).where(eq(smtpConnections.id, existing.id))
  else await db.insert(smtpConnections).values({ id: id(), userId: user.id, createdAt: now, ...values })
  return { ok: true }
})
