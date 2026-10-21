import { readFile, stat } from 'node:fs/promises'
import { appBaseUrl } from '../http'
import { absoluteMediaPath } from '../media'
import { formPost, jsonRequest, readString } from './http'
import type { OAuthApp, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

export function youtubeAuthUrl(state: string, app: OAuthApp) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/youtube`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function youtubeExchange(code: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://oauth2.googleapis.com/token', {
    code,
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: `${appBaseUrl()}/api/social/callback/youtube`,
    grant_type: 'authorization_code',
  })
  return tokenFrom(data)
}

export async function youtubeRefresh(refreshToken: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://oauth2.googleapis.com/token', {
    client_id: app.clientId,
    client_secret: app.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  return tokenFrom(data)
}

export async function youtubeChannel(token: string) {
  const data = await jsonRequest('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', { token })
  const items = Array.isArray(data.items) ? data.items as Record<string, unknown>[] : []
  const channel = items[0]
  if (!channel) throw new Error('Geen YouTube-kanaal gevonden')
  const snippet = (channel.snippet || {}) as Record<string, unknown>
  const details = (channel.contentDetails || {}) as Record<string, unknown>
  const related = (details.relatedPlaylists || {}) as Record<string, unknown>
  return {
    externalId: readString(channel, 'id'),
    displayName: readString(snippet, 'title') || 'YouTube',
    uploadsPlaylistId: readString(related, 'uploads'),
  }
}

export async function youtubeRecent(token: string, playlistId: string): Promise<RemotePost[]> {
  if (!playlistId) return []
  const data = await jsonRequest(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${playlistId}`, { token })
  const items = Array.isArray(data.items) ? data.items as Record<string, unknown>[] : []
  return items.map((item) => {
    const snippet = (item.snippet || {}) as Record<string, unknown>
    const resource = (snippet.resourceId || {}) as Record<string, unknown>
    return {
      externalId: readString(resource, 'videoId') || readString(item, 'id'),
      title: readString(snippet, 'title'),
      body: readString(snippet, 'description'),
      url: readString(resource, 'videoId') ? `https://www.youtube.com/watch?v=${readString(resource, 'videoId')}` : null,
      publishedAt: readString(snippet, 'publishedAt') ? new Date(readString(snippet, 'publishedAt')) : null,
    }
  })
}

export async function youtubePublish(token: string, input: PublishInput): Promise<PublishResult> {
  if (!input.video) throw new Error('YouTube heeft een videobestand nodig')
  const filePath = absoluteMediaPath(input.video.path)
  const info = await stat(filePath)
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-length': String(info.size),
      'x-upload-content-type': input.video.mime,
    },
    body: JSON.stringify({
      snippet: { title: input.title || input.body.slice(0, 100) || 'Video', description: input.body },
      status: { privacyStatus: 'public' },
    }),
  })
  if (!start.ok) throw new Error(await start.text())
  const uploadUrl = start.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube gaf geen upload-URL terug')
  const bytes = await readFile(filePath)
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': input.video.mime, 'content-length': String(bytes.length) },
    body: bytes,
  })
  const data = await uploaded.json() as Record<string, unknown>
  if (!uploaded.ok) throw new Error(JSON.stringify(data).slice(0, 300))
  const videoId = readString(data, 'id')
  return { externalId: videoId, url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null }
}

function tokenFrom(data: Record<string, unknown>): TokenSet {
  const expiresIn = Number(data.expires_in || 0)
  return {
    accessToken: readString(data, 'access_token'),
    refreshToken: readString(data, 'refresh_token') || null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  }
}
