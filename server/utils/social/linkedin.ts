import { readFile } from 'node:fs/promises'
import { appBaseUrl } from '../http'
import { absoluteMediaPath } from '../media'
import { formPost, jsonRequest, readString } from './http'
import type { PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const version = '202410'

export function linkedinAuthUrl(state: string) {
  const config = useRuntimeConfig()
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.linkedinClientId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/linkedin`)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'openid profile email w_member_social')
  return url.toString()
}

export async function linkedinExchange(code: string): Promise<TokenSet> {
  const config = useRuntimeConfig()
  const data = await formPost('https://www.linkedin.com/oauth/v2/accessToken', {
    grant_type: 'authorization_code',
    code,
    client_id: config.linkedinClientId,
    client_secret: config.linkedinClientSecret,
    redirect_uri: `${appBaseUrl()}/api/social/callback/linkedin`,
  })
  return tokenFrom(data)
}

export async function linkedinRefresh(refreshToken: string): Promise<TokenSet> {
  const config = useRuntimeConfig()
  const data = await formPost('https://www.linkedin.com/oauth/v2/accessToken', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.linkedinClientId,
    client_secret: config.linkedinClientSecret,
  })
  return tokenFrom(data)
}

export async function linkedinProfile(token: string) {
  const data = await jsonRequest('https://api.linkedin.com/v2/userinfo', { token })
  return {
    externalId: readString(data, 'sub'),
    displayName: readString(data, 'name') || 'LinkedIn',
  }
}

export async function linkedinRecent(token: string, personId: string): Promise<RemotePost[]> {
  const author = encodeURIComponent(`urn:li:person:${personId}`)
  const data = await jsonRequest(`https://api.linkedin.com/rest/posts?author=${author}&q=author&count=20`, {
    token,
    headers: { 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' },
  })
  const elements = Array.isArray(data.elements) ? data.elements : []
  return elements.map((item) => {
    const post = item as Record<string, unknown>
    return {
      externalId: readString(post, 'id'),
      body: readString(post, 'commentary'),
      url: null,
      publishedAt: null,
    }
  }).filter(post => post.externalId)
}

export async function linkedinPublish(token: string, personId: string, input: PublishInput): Promise<PublishResult> {
  let imageUrn: string | null = null
  if (input.image) {
    imageUrn = await uploadImage(token, personId, input.image.path)
  }
  const data = await jsonRequest('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    token,
    headers: { 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' },
    body: {
      author: `urn:li:person:${personId}`,
      commentary: input.body,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      ...(imageUrn
        ? { content: { media: { id: imageUrn } } }
        : {}),
    },
  })
  return { externalId: readString(data, 'id') || `linkedin-${Date.now()}` }
}

async function uploadImage(token: string, personId: string, path: string) {
  const init = await jsonRequest('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    token,
    headers: { 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' },
    body: { initializeUploadRequest: { owner: `urn:li:person:${personId}` } },
  })
  const value = (init.value || {}) as Record<string, unknown>
  const uploadUrl = readString(value, 'uploadUrl')
  const imageUrn = readString(value, 'image')
  const bytes = await readFile(absoluteMediaPath(path))
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    body: bytes,
  })
  if (!upload.ok) throw new Error(`LinkedIn-upload mislukte (${upload.status})`)
  return imageUrn
}

function tokenFrom(data: Record<string, unknown>): TokenSet {
  const expiresIn = Number(data.expires_in || 0)
  return {
    accessToken: readString(data, 'access_token'),
    refreshToken: readString(data, 'refresh_token') || null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
  }
}
