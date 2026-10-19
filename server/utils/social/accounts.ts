import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { socialAccounts } from '../../db/schema'
import { decrypt, encrypt } from '../crypto'
import { id, parseJson } from '../http'
import { linkedinRefresh } from './linkedin'
import { tiktokRefresh } from './tiktok'
import type { ConnectedAccount, TokenSet } from './types'
import { youtubeRefresh } from './youtube'

export async function upsertSocialAccount(userId: string, account: ConnectedAccount) {
  const db = useDb()
  const existing = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.platform, account.platform),
      eq(socialAccounts.externalId, account.externalId),
    ),
  })
  const now = new Date()
  const values = {
    displayName: account.displayName,
    accessTokenEnc: encrypt(account.accessToken),
    refreshTokenEnc: account.refreshToken ? encrypt(account.refreshToken) : existing?.refreshTokenEnc || null,
    expiresAt: account.expiresAt || null,
    metaJson: JSON.stringify(account.meta || {}),
    updatedAt: now,
  }
  if (existing) {
    await db.update(socialAccounts).set(values).where(eq(socialAccounts.id, existing.id))
    return existing.id
  }
  const accountId = id()
  await db.insert(socialAccounts).values({
    id: accountId,
    userId,
    platform: account.platform,
    externalId: account.externalId,
    createdAt: now,
    ...values,
  })
  return accountId
}

export async function readyAccount(accountId: string) {
  const db = useDb()
  const row = await db.query.socialAccounts.findFirst({ where: eq(socialAccounts.id, accountId) })
  if (!row) throw new Error('Account niet gevonden')
  let accessToken = decrypt(row.accessTokenEnc)
  let refreshToken = row.refreshTokenEnc ? decrypt(row.refreshTokenEnc) : null
  let expiresAt = row.expiresAt
  if (expiresAt && expiresAt.getTime() < Date.now() + 60_000 && refreshToken) {
    const next = await refresh(row.platform, refreshToken)
    accessToken = next.accessToken
    refreshToken = next.refreshToken || refreshToken
    expiresAt = next.expiresAt || null
    await db.update(socialAccounts).set({
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: refreshToken ? encrypt(refreshToken) : null,
      expiresAt,
      updatedAt: new Date(),
    }).where(eq(socialAccounts.id, row.id))
  }
  return {
    row,
    account: {
      platform: row.platform as ConnectedAccount['platform'],
      externalId: row.externalId,
      displayName: row.displayName,
      accessToken,
      refreshToken,
      expiresAt,
      meta: parseJson<Record<string, string>>(row.metaJson, {}),
    } satisfies ConnectedAccount,
  }
}

async function refresh(platform: string, refreshToken: string): Promise<TokenSet> {
  if (platform === 'linkedin') return linkedinRefresh(refreshToken)
  if (platform === 'youtube') return youtubeRefresh(refreshToken)
  if (platform === 'tiktok') return tiktokRefresh(refreshToken)
  return { accessToken: refreshToken }
}
