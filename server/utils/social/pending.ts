import { z } from 'zod'
import { decrypt, encrypt } from '../crypto'
import { apiError } from '../http'
import { createRecord, filterOf, firstRecord, removeRecord } from '../pb'

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

function asDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function saveConnectPending(userId: string, provider: 'linkedin' | 'meta', payload: LinkedInPending) {
  const row = await createRecord('social_connect_pending', {
    user: userId,
    provider,
    payloadEnc: encrypt(JSON.stringify(payload)),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  })
  return row.id
}

export function saveLinkedInPending(userId: string, payload: LinkedInPending) {
  return saveConnectPending(userId, 'linkedin', payload)
}

export async function readLinkedInPending(userId: string, pendingId: string) {
  const row = await firstRecord('social_connect_pending', await filterOf(
    'id = {:id} && user = {:user}',
    { id: pendingId, user: userId },
  ))
  if (!row || (row.provider !== 'linkedin' && row.provider !== 'meta')) apiError(404, 'De accountkeuze is niet gevonden')
  const expiresAt = asDate(row.expiresAt)
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await removeRecord('social_connect_pending', row.id)
    apiError(410, 'De accountkeuze is verlopen. Koppel opnieuw.')
  }
  const parsed = payloadSchema.safeParse(JSON.parse(decrypt(String(row.payloadEnc || ''))))
  if (!parsed.success) apiError(400, 'De accountkeuze is ongeldig')
  return { payload: parsed.data }
}

export async function deleteLinkedInPending(userId: string, pendingId: string) {
  const row = await firstRecord('social_connect_pending', await filterOf(
    'id = {:id} && user = {:user}',
    { id: pendingId, user: userId },
  ))
  if (row) await removeRecord('social_connect_pending', row.id)
}
