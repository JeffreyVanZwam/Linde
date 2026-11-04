import { appBaseUrl } from '../http'
import { formPost, jsonRequest, readString } from './http'
import type { OAuthApp, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const scopes = 'boards:read,pins:read,pins:write,user_accounts:read'

export function pinterestAuthUrl(state: string, app: OAuthApp) {
  const url = new URL('https://www.pinterest.com/oauth/')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/pinterest`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function pinterestExchange(code: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://api.pinterest.com/v5/oauth/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${appBaseUrl()}/api/social/callback/pinterest`,
  }, basic(app))
  return tokenFrom(data)
}

export async function pinterestRefresh(refreshToken: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://api.pinterest.com/v5/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }, basic(app))
  return tokenFrom(data)
}

export async function pinterestProfile(token: string) {
  const data = await jsonRequest('https://api.pinterest.com/v5/user_account', { token })
  const boards = await jsonRequest('https://api.pinterest.com/v5/boards', { token })
  const items = Array.isArray(boards.items) ? boards.items : []
  const first = (items[0] || {}) as Record<string, unknown>
  return {
    externalId: readString(data, 'id') || readString(data, 'username'),
    displayName: readString(data, 'username') || 'Pinterest',
    boardId: readString(first, 'id'),
  }
}

export async function pinterestRecent(token: string): Promise<RemotePost[]> {
  const data = await jsonRequest('https://api.pinterest.com/v5/pins', { token })
  const items = Array.isArray(data.items) ? data.items : []
  return items.flatMap((item) => {
    const pin = item as Record<string, unknown>
    const externalId = readString(pin, 'id')
    if (!externalId) return []
    return [{
      externalId,
      body: readString(pin, 'description') || readString(pin, 'title'),
      title: readString(pin, 'title'),
      url: readString(pin, 'link') || `https://www.pinterest.com/pin/${externalId}/`,
      publishedAt: readString(pin, 'created_at') ? new Date(readString(pin, 'created_at')) : null,
    }]
  })
}

export async function pinterestPublish(token: string, boardId: string, input: PublishInput): Promise<PublishResult> {
  if (!input.image) throw new Error('Pinterest heeft een afbeelding nodig')
  if (!boardId) throw new Error('Geen Pinterest-bord gevonden')
  const data = await jsonRequest('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    token,
    body: {
      board_id: boardId,
      title: (input.title || input.body).slice(0, 100),
      description: input.body.slice(0, 500),
      media_source: {
        source_type: 'image_base64',
        content_type: input.image.mime,
        data: Buffer.from(input.image.bytes).toString('base64'),
      },
    },
  })
  const externalId = readString(data, 'id')
  return { externalId, url: externalId ? `https://www.pinterest.com/pin/${externalId}/` : null }
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
