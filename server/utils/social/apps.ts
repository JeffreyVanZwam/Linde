import { z } from 'zod'
import { connectProviders, type ConnectProvider } from '~~/shared/platforms'
import { decrypt, encrypt } from '../crypto'
import { appBaseUrl } from '../http'
import { createRecord, filterOf, firstRecord, listRecords, updateRecord, type PbRecord } from '../pb'
import type { OAuthApp } from './types'

export const tiktokPrivacyLevels = ['SELF_ONLY', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'PUBLIC_TO_EVERYONE'] as const

export const socialAppViewSchema = z.object({
  provider: z.enum(connectProviders),
  clientId: z.string(),
  configured: z.boolean(),
  privacy: z.enum(tiktokPrivacyLevels),
  redirectUri: z.string(),
})

export const socialAppsResponseSchema = z.array(socialAppViewSchema)
export type SocialAppView = z.infer<typeof socialAppViewSchema>

const envNames: Record<ConnectProvider, [string, string]> = {
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  meta: ['META_APP_ID', 'META_APP_SECRET'],
  youtube: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
}

type SocialAppRow = {
  id: string
  provider: string
  clientId: string
  clientSecretEnc: string
  privacy: string | null
}

function mapApp(record: PbRecord): SocialAppRow {
  const privacy = typeof record.privacy === 'string' && record.privacy ? record.privacy : null
  return {
    id: record.id,
    provider: String(record.provider || ''),
    clientId: String(record.clientId || ''),
    clientSecretEnc: String(record.clientSecretEnc || ''),
    privacy,
  }
}

function envApp(provider: ConnectProvider): OAuthApp | null {
  const [idName, secretName] = envNames[provider]
  const clientId = process.env[idName]
  const clientSecret = process.env[secretName]
  if (!clientId || !clientSecret) return null
  const privacy = tiktokPrivacyLevels.find(level => level === process.env.TIKTOK_PRIVACY) || 'SELF_ONLY'
  return { clientId, clientSecret, privacy }
}

async function findApp(userId: string, provider: string) {
  const row = await firstRecord('social_provider_apps', await filterOf(
    'user = {:user} && provider = {:provider}',
    { user: userId, provider },
  ))
  return row ? mapApp(row) : null
}

export async function socialApp(userId: string, provider: ConnectProvider): Promise<OAuthApp | null> {
  const row = await findApp(userId, provider)
  if (!row) return envApp(provider)
  const privacy = tiktokPrivacyLevels.find(level => level === row.privacy) || 'SELF_ONLY'
  return { clientId: row.clientId, clientSecret: decrypt(row.clientSecretEnc), privacy }
}

export async function listSocialApps(userId: string): Promise<SocialAppView[]> {
  const rows = (await listRecords('social_provider_apps', {
    filter: await filterOf('user = {:user}', { user: userId }),
  })).map(mapApp)
  return socialAppsResponseSchema.parse(connectProviders.map((provider) => {
    const row = rows.find(item => item.provider === provider)
    const fallback = envApp(provider)
    const privacy = tiktokPrivacyLevels.find(level => level === (row?.privacy || fallback?.privacy)) || 'SELF_ONLY'
    return {
      provider,
      clientId: row?.clientId || fallback?.clientId || '',
      configured: Boolean(row || fallback),
      privacy,
      redirectUri: `${appBaseUrl()}/api/social/callback/${provider}`,
    }
  }))
}

export async function socialReady(userId: string) {
  const apps = await listSocialApps(userId)
  return Object.fromEntries(apps.map(app => [app.provider, app.configured])) as Record<ConnectProvider, boolean>
}

export async function saveSocialApp(userId: string, input: {
  provider: ConnectProvider
  clientId: string
  clientSecret?: string
  privacy?: (typeof tiktokPrivacyLevels)[number]
}) {
  const existing = await findApp(userId, input.provider)
  const fallback = envApp(input.provider)
  let secret = input.clientSecret
  if (!secret) {
    if (existing) secret = decrypt(existing.clientSecretEnc)
    else if (fallback && fallback.clientId === input.clientId) secret = fallback.clientSecret
  }
  if (!secret) throw createError({ statusCode: 400, statusMessage: 'Client secret is verplicht' })
  const values = {
    clientId: input.clientId,
    clientSecretEnc: encrypt(secret),
    privacy: input.provider === 'tiktok' ? (input.privacy || existing?.privacy || fallback?.privacy || 'SELF_ONLY') : '',
  }
  if (existing) await updateRecord('social_provider_apps', existing.id, values)
  else await createRecord('social_provider_apps', { user: userId, provider: input.provider, ...values })
}
