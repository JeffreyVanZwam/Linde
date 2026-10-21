import { decrypt, encrypt } from '../crypto'
import { parseJson } from '../http'
import { createSocialAccount, findSocialAccount, findSocialAccountMatch, updateSocialAccount } from '../store'
import { socialApp } from './apps'
import { linkedinRefresh } from './linkedin'
import { tiktokRefresh } from './tiktok'
import type { ConnectedAccount, TokenSet } from './types'
import { youtubeRefresh } from './youtube'

export async function upsertSocialAccount(userId: string, account: ConnectedAccount) {
  const existing = await findSocialAccountMatch(userId, account.platform, account.externalId)
  const values = {
    displayName: account.displayName,
    accessTokenEnc: encrypt(account.accessToken),
    refreshTokenEnc: account.refreshToken ? encrypt(account.refreshToken) : existing?.refreshTokenEnc || null,
    expiresAt: account.expiresAt || null,
    metaJson: JSON.stringify(account.meta || {}),
  }
  if (existing) {
    await updateSocialAccount(existing.id, values)
    return existing.id
  }
  return createSocialAccount({
    userId,
    platform: account.platform,
    externalId: account.externalId,
    ...values,
  })
}

export async function readyAccount(accountId: string) {
  const row = await findSocialAccount(accountId)
  if (!row) throw new Error('Account niet gevonden')
  let accessToken = decrypt(row.accessTokenEnc)
  let refreshToken = row.refreshTokenEnc ? decrypt(row.refreshTokenEnc) : null
  let expiresAt = row.expiresAt
  if (expiresAt && expiresAt.getTime() < Date.now() + 60_000 && refreshToken) {
    const next = await refresh(row.userId, row.platform, refreshToken)
    accessToken = next.accessToken
    refreshToken = next.refreshToken || refreshToken
    expiresAt = next.expiresAt || null
    await updateSocialAccount(row.id, {
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: refreshToken ? encrypt(refreshToken) : null,
      expiresAt,
    })
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

async function refresh(userId: string, platform: string, refreshToken: string): Promise<TokenSet> {
  if (platform !== 'linkedin' && platform !== 'youtube' && platform !== 'tiktok') return { accessToken: refreshToken }
  const app = await socialApp(userId, platform)
  if (!app) throw new Error('App-gegevens ontbreken')
  if (platform === 'linkedin') return linkedinRefresh(refreshToken, app)
  if (platform === 'youtube') return youtubeRefresh(refreshToken, app)
  return tiktokRefresh(refreshToken, app)
}
