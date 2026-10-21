import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/client'
import { socialConnectPending } from '../../db/schema'
import { decrypt, encrypt } from '../crypto'
import { apiError, id } from '../http'

const optionSchema = z.object({
  externalId: z.string().min(1),
  displayName: z.string().min(1),
  authorType: z.enum(['person', 'organization']),
  platform: z.enum(['linkedin', 'facebook', 'instagram']).optional(),
  accessToken: z.string().min(1).optional(),
  pageId: z.string().optional(),
})

const payloadSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().nullable(),
  expiresAt: z.string().nullable(),
  options: z.array(optionSchema).min(1),
})

export type LinkedInChoice = z.infer<typeof optionSchema>
export type LinkedInPending = z.infer<typeof payloadSchema>

const ttlMs = 15 * 60 * 1000

export async function saveConnectPending(userId: string, provider: 'linkedin' | 'meta', payload: LinkedInPending) {
  const pendingId = id()
  const now = new Date()
  await useDb().insert(socialConnectPending).values({
    id: pendingId,
    userId,
    provider,
    payloadEnc: encrypt(JSON.stringify(payload)),
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
  })
  return pendingId
}

export function saveLinkedInPending(userId: string, payload: LinkedInPending) {
  return saveConnectPending(userId, 'linkedin', payload)
}

export async function readLinkedInPending(userId: string, pendingId: string) {
  const db = useDb()
  const row = await db.query.socialConnectPending.findFirst({
    where: and(eq(socialConnectPending.id, pendingId), eq(socialConnectPending.userId, userId)),
  })
  if (!row || (row.provider !== 'linkedin' && row.provider !== 'meta')) apiError(404, 'De accountkeuze is niet gevonden')
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(socialConnectPending).where(eq(socialConnectPending.id, row.id))
    apiError(410, 'De accountkeuze is verlopen. Koppel opnieuw.')
  }
  const parsed = payloadSchema.safeParse(JSON.parse(decrypt(row.payloadEnc)))
  if (!parsed.success) apiError(400, 'De accountkeuze is ongeldig')
  return { row, payload: parsed.data }
}

export async function deleteLinkedInPending(userId: string, pendingId: string) {
  await useDb().delete(socialConnectPending).where(and(
    eq(socialConnectPending.id, pendingId),
    eq(socialConnectPending.userId, userId),
  ))
}
