import { readFile, stat } from 'node:fs/promises'
import { appBaseUrl } from '../http'
import { absoluteMediaPath } from '../media'
import { formPost, jsonRequest, readString } from './http'
import type { PublishInput, PublishResult, RemotePost, TokenSet } from './types'

export function tiktokAuthUrl(state: string) {
  const config = useRuntimeConfig()
  const url = new URL('https://www.tiktok.com/v2/auth/authorize/')
  url.searchParams.set('client_key', config.tiktokClientKey)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'user.info.basic,video.list,video.publish')
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/tiktok`)
  url.searchParams.set('state', state)
  return url.toString()
}

export async function tiktokExchange(code: string): Promise<TokenSet> {
  const config = useRuntimeConfig()
  const data = await formPost('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: config.tiktokClientKey,
    client_secret: config.tiktokClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${appBaseUrl()}/api/social/callback/tiktok`,
  })
  return tokenFrom(data)
}

export async function tiktokRefresh(refreshToken: string): Promise<TokenSet> {
  const config = useRuntimeConfig()
  const data = await formPost('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: useRuntimeConfig().tiktokClientKey,
    client_secret: config.tiktokClientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  return tokenFrom(data)
}

export async function tiktokProfile(token: string) {
  const data = await jsonRequest('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', {
    method: 'GET',
    token,
  })
  const user = ((data.data as Record<string, unknown> | undefined)?.user || {}) as Record<string, unknown>
  return {
    externalId: readString(user, 'open_id'),
    displayName: readString(user, 'display_name') || 'TikTok',
  }
}

export async function tiktokRecent(token: string): Promise<RemotePost[]> {
  const data = await jsonRequest('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,share_url,create_time', {
    method: 'POST',
    token,
    body: { max_count: 20 },
  })
  const videos = ((data.data as Record<string, unknown> | undefined)?.videos || []) as Record<string, unknown>[]
  return videos.map(video => ({
    externalId: readString(video, 'id'),
    title: readString(video, 'title'),
    body: readString(video, 'video_description'),
    url: readString(video, 'share_url'),
    publishedAt: video.create_time ? new Date(Number(video.create_time) * 1000) : null,
  })).filter(video => video.externalId)
}

export async function tiktokPublish(token: string, input: PublishInput): Promise<PublishResult> {
  if (!input.video) throw new Error('TikTok heeft een videobestand nodig')
  const filePath = absoluteMediaPath(input.video.path)
  const info = await stat(filePath)
  const init = await jsonRequest('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    token,
    body: {
      post_info: {
        title: input.title || input.body.slice(0, 150),
        privacy_level: useRuntimeConfig().tiktokPrivacy || 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: info.size,
        chunk_size: info.size,
        total_chunk_count: 1,
      },
    },
  })
  const data = (init.data || {}) as Record<string, unknown>
  const uploadUrl = readString(data, 'upload_url')
  const publishId = readString(data, 'publish_id')
  if (!uploadUrl) throw new Error('TikTok gaf geen upload-URL terug')
  const bytes = await readFile(filePath)
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': input.video.mime,
      'content-length': String(bytes.length),
      'content-range': `bytes 0-${bytes.length - 1}/${bytes.length}`,
    },
    body: bytes,
  })
  if (!uploaded.ok) throw new Error(await uploaded.text())
  return { externalId: publishId }
}

function tokenFrom(data: Record<string, unknown>): TokenSet {
  const expiresIn = Number(data.expires_in || 0)
  return {
    accessToken: readString(data, 'access_token'),
    refreshToken: readString(data, 'refresh_token') || null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  }
}
