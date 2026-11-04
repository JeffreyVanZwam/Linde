import { createHash, randomBytes } from 'node:crypto'
import { appBaseUrl } from '../http'
import { formPost, jsonRequest, readString } from './http'
import type { OAuthApp, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const scopes = 'tweet.read tweet.write users.read offline.access'

export function xVerifier() {
  return randomBytes(32).toString('base64url')
}

export function xAuthUrl(state: string, verifier: string, app: OAuthApp) {
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const url = new URL('https://twitter.com/i/oauth2/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/x`)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export async function xExchange(code: string, verifier: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://api.twitter.com/2/oauth2/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${appBaseUrl()}/api/social/callback/x`,
    code_verifier: verifier,
    client_id: app.clientId,
  }, basic(app))
  return tokenFrom(data)
}

export async function xRefresh(refreshToken: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://api.twitter.com/2/oauth2/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: app.clientId,
  }, basic(app))
  return tokenFrom(data)
}

export async function xProfile(token: string) {
  const data = await jsonRequest('https://api.twitter.com/2/users/me', { token })
  const user = (data.data || {}) as Record<string, unknown>
  return {
    externalId: readString(user, 'id'),
    displayName: readString(user, 'name') || readString(user, 'username') || 'X',
  }
}

export async function xRecent(token: string, externalId: string): Promise<RemotePost[]> {
  const data = await jsonRequest(`https://api.twitter.com/2/users/${externalId}/tweets?max_results=10&tweet.fields=created_at,text`, { token })
  const rows = Array.isArray(data.data) ? data.data : []
  return rows.flatMap((item) => {
    const tweet = item as Record<string, unknown>
    const externalId = readString(tweet, 'id')
    if (!externalId) return []
    return [{
      externalId,
      body: readString(tweet, 'text'),
      url: `https://x.com/i/web/status/${externalId}`,
      publishedAt: readString(tweet, 'created_at') ? new Date(readString(tweet, 'created_at')) : null,
    }]
  })
}

export async function xPublish(token: string, input: PublishInput): Promise<PublishResult> {
  const data = await jsonRequest('https://api.twitter.com/2/tweets', {
    method: 'POST',
    token,
    body: { text: input.body.slice(0, 280) },
  })
  const tweet = (data.data || {}) as Record<string, unknown>
  const externalId = readString(tweet, 'id')
  return { externalId, url: externalId ? `https://x.com/i/web/status/${externalId}` : null }
}

function basic(app: OAuthApp) {
  return { authorization: `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString('base64')}` }
}

function tokenFrom(data: Record<string, unknown>): TokenSet {
  const expiresIn = Number(data.expires_in || 0)
  return {
    accessToken: readString(data, 'access_token'),
    refreshToken: readString(data, 'refresh_token') || null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  }
}
