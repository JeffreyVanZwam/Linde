import { fileBlob } from '../bytes'
import { appBaseUrl } from '../http'
import { chunks, formPost, jsonRequest, readCount, readString } from './http'
import type { OAuthApp, PostMetrics, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

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
  const posts: RemotePost[] = []
  for (const item of elements) {
    const post = item as Record<string, unknown>
    const externalId = readString(post, 'id')
    if (!externalId) continue
    posts.push({
      externalId,
      body: readString(post, 'commentary'),
      url: null,
      imageUrl: await linkedinImage(token, post),
      publishedAt: linkedinTime(post.publishedAt) || linkedinTime(post.createdAt),
    })
  }
  return posts
}

async function linkedinImage(token: string, post: Record<string, unknown>) {
  const content = post.content as Record<string, unknown> | undefined
  const media = content?.media as Record<string, unknown> | undefined
  const multi = content?.multiImage as { images?: Array<Record<string, unknown>> } | undefined
  const urn = readString(media || {}, 'id') || readString(multi?.images?.[0] || {}, 'id')
  if (!urn) return null
  try {
    const data = await jsonRequest(`https://api.linkedin.com/rest/images/${encodeURIComponent(urn)}`, {
      token,
      headers: linkedinHeaders(),
    })
    return readString(data, 'downloadUrl') || null
  }
  catch {
    return null
  }
}

export async function linkedinMetrics(token: string, organizationId: string, externalIds: string[]) {
  const metrics = new Map<string, PostMetrics>()
  const warnings: string[] = []
  const shares = externalIds.filter(id => !id.includes('ugcPost'))
  const ugc = externalIds.filter(id => id.includes('ugcPost'))
  await pull('shares', shares.map(id => id.startsWith('urn:') ? id : `urn:li:share:${id}`))
  await pull('ugcPosts', ugc.map(id => id.startsWith('urn:') ? id : `urn:li:ugcPost:${id}`))
  return { metrics, warning: warnings[0]?.slice(0, 240) || null }

  async function pull(param: 'shares' | 'ugcPosts', urns: string[]) {
    for (const group of chunks(urns, 10)) {
      try {
        const list = `List(${group.map(urn => encodeURIComponent(urn)).join(',')})`
        const org = encodeURIComponent(`urn:li:organization:${organizationId}`)
        const data = await jsonRequest(`https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${org}&${param}=${list}`, {
          token,
          headers: linkedinHeaders(),
        })
        const elements = Array.isArray(data.elements) ? data.elements as Record<string, unknown>[] : []
        for (const element of elements) {
          const id = readString(element, 'share') || readString(element, 'ugcPost')
          const stats = (element.totalShareStatistics || {}) as Record<string, unknown>
          if (!id) continue
          const value: PostMetrics = {
            impressions: readCount(stats.impressionCount),
            reach: readCount(stats.uniqueImpressionsCount),
            likes: readCount(stats.likeCount),
            comments: readCount(stats.commentCount),
            shares: readCount(stats.shareCount),
            saves: null,
            clicks: readCount(stats.clickCount),
          }
          metrics.set(id, value)
          for (const original of externalIds) {
            if (original === id || id.endsWith(original) || original.endsWith(id)) metrics.set(original, value)
          }
        }
      }
      catch (error) {
        warnings.push(error instanceof Error ? error.message : 'LinkedIn-cijfers mislukt')
      }
    }
  }
}

export async function linkedinPublish(token: string, externalId: string, input: PublishInput, authorType?: string): Promise<PublishResult> {
  const author = linkedinAuthorUrn(externalId, authorType)
  let imageUrn: string | null = null
  if (input.image) {
    imageUrn = await uploadImage(token, author, input.image.bytes)
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

function linkedinTime(value: unknown) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  const date = new Date(numeric > 1e12 ? numeric : numeric * 1000)
  return Number.isNaN(date.getTime()) ? null : date
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

async function uploadImage(token: string, owner: string, bytes: Uint8Array) {
  const init = await jsonRequest('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    token,
    headers: linkedinHeaders(),
    body: { initializeUploadRequest: { owner } },
  })
  const value = (init.value || {}) as Record<string, unknown>
  const uploadUrl = readString(value, 'uploadUrl')
  const imageUrn = readString(value, 'image')
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    body: fileBlob(bytes),
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
