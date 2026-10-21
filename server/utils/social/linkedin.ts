import { readFile } from 'node:fs/promises'
import { appBaseUrl } from '../http'
import { absoluteMediaPath } from '../media'
import { formPost, jsonRequest, readString } from './http'
import type { OAuthApp, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const version = '202609'
const scopes = 'openid profile email w_member_social w_organization_social r_organization_social rw_organization_admin'
const pageRoles = new Set(['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR'])

export function linkedinAuthUrl(state: string, app: OAuthApp) {
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/linkedin`)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', scopes)
  return url.toString()
}

export async function linkedinExchange(code: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://www.linkedin.com/oauth/v2/accessToken', {
    grant_type: 'authorization_code',
    code,
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: `${appBaseUrl()}/api/social/callback/linkedin`,
  })
  return tokenFrom(data)
}

export async function linkedinRefresh(refreshToken: string, app: OAuthApp): Promise<TokenSet> {
  const data = await formPost('https://www.linkedin.com/oauth/v2/accessToken', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: app.clientId,
    client_secret: app.clientSecret,
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

export async function linkedinOrganizations(token: string) {
  const data = await jsonRequest('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=50', {
    token,
    headers: linkedinHeaders(),
  })
  const elements = Array.isArray(data.elements) ? data.elements : []
  const ids = [...new Set(elements.flatMap((item) => {
    const row = item as Record<string, unknown>
    if (!pageRoles.has(readString(row, 'role'))) return []
    const id = organizationId(row)
    return id ? [id] : []
  }))]
  const pages = await Promise.all(ids.map(async (id) => {
    try {
      const organization = await jsonRequest(`https://api.linkedin.com/rest/organizations/${id}`, {
        token,
        headers: linkedinHeaders(),
      })
      return {
        externalId: id,
        displayName: readString(organization, 'localizedName') || `LinkedIn ${id}`,
        authorType: 'organization' as const,
      }
    }
    catch {
      return { externalId: id, displayName: `LinkedIn ${id}`, authorType: 'organization' as const }
    }
  }))
  return pages
}

export async function linkedinRecent(token: string, externalId: string, authorType?: string): Promise<RemotePost[]> {
  const author = encodeURIComponent(linkedinAuthorUrn(externalId, authorType))
  const data = await jsonRequest(`https://api.linkedin.com/rest/posts?author=${author}&q=author&count=20`, {
    token,
    headers: linkedinHeaders(),
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

export async function linkedinPublish(token: string, externalId: string, input: PublishInput, authorType?: string): Promise<PublishResult> {
  const author = linkedinAuthorUrn(externalId, authorType)
  let imageUrn: string | null = null
  if (input.image) {
    imageUrn = await uploadImage(token, author, input.image.path)
  }
  const data = await jsonRequest('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    token,
    headers: linkedinHeaders(),
    body: {
      author,
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

function linkedinAuthorUrn(externalId: string, authorType?: string) {
  if (authorType === 'organization') return `urn:li:organization:${externalId}`
  return `urn:li:person:${externalId}`
}

function linkedinHeaders() {
  return { 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' }
}

function organizationId(row: Record<string, unknown>) {
  const raw = readString(row, 'organization') || readString(row, 'organizationTarget')
  return raw.match(/urn:li:organization:(\d+)/)?.[1] || ''
}

async function uploadImage(token: string, owner: string, path: string) {
  const init = await jsonRequest('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    token,
    headers: linkedinHeaders(),
    body: { initializeUploadRequest: { owner } },
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
