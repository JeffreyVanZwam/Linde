import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { connectProviders, type ConnectProvider } from '~~/shared/platforms'
import { useDb } from '../../db/client'
import { socialProviderApps } from '../../db/schema'
import { decrypt, encrypt } from '../crypto'
import { appBaseUrl, id } from '../http'
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

function envApp(provider: ConnectProvider): OAuthApp | null {
  const [idName, secretName] = envNames[provider]
  const clientId = process.env[idName]
  const clientSecret = process.env[secretName]
  if (!clientId || !clientSecret) return null
  const privacy = tiktokPrivacyLevels.find(level => level === process.env['TIKTOK_PRIVACY']) || 'SELF_ONLY'
  return { clientId, clientSecret, privacy }
}

export async function socialApp(userId: string, provider: ConnectProvider): Promise<OAuthApp | null> {
  const row = await useDb().query.socialProviderApps.findFirst({
    where: and(eq(socialProviderApps.userId, userId), eq(socialProviderApps.provider, provider)),
  })
  if (!row) return envApp(provider)
  const privacy = tiktokPrivacyLevels.find(level => level === row.privacy) || 'SELF_ONLY'
  return { clientId: row.clientId, clientSecret: decrypt(row.clientSecretEnc), privacy }
}

export async function listSocialApps(userId: string): Promise<SocialAppView[]> {
  const rows = await useDb().query.socialProviderApps.findMany({
    where: eq(socialProviderApps.userId, userId),
  })
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
  const db = useDb()
  const existing = await db.query.socialProviderApps.findFirst({
    where: and(eq(socialProviderApps.userId, userId), eq(socialProviderApps.provider, input.provider)),
  })
  const fallback = envApp(input.provider)
  let secret = input.clientSecret
  if (!secret) {
    if (existing) secret = decrypt(existing.clientSecretEnc)
    else if (fallback && fallback.clientId === input.clientId) secret = fallback.clientSecret
  }
  if (!secret) throw createError({ statusCode: 400, statusMessage: 'Client secret is verplicht' })
  const now = new Date()
  const values = {
    clientId: input.clientId,
    clientSecretEnc: encrypt(secret),
    privacy: input.provider === 'tiktok' ? (input.privacy || existing?.privacy || fallback?.privacy || 'SELF_ONLY') : null,
    updatedAt: now,
  }
  if (existing) {
    await db.update(socialProviderApps).set(values).where(eq(socialProviderApps.id, existing.id))
  }
  else {
    await db.insert(socialProviderApps).values({
      id: id(),
      userId,
      provider: input.provider,
      createdAt: now,
      ...values,
    })
  }
}
