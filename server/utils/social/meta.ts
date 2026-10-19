import { readFile } from 'node:fs/promises'
import { appBaseUrl } from '../http'
import { signValue } from '../crypto'
import { absoluteMediaPath } from '../media'
import { formPost, jsonRequest, readString } from './http'
import type { ConnectedAccount, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const graph = 'https://graph.facebook.com/v21.0'

export function metaAuthUrl(state: string) {
  const config = useRuntimeConfig()
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  url.searchParams.set('client_id', config.metaAppId)
  url.searchParams.set('redirect_uri', `${appBaseUrl()}/api/social/callback/meta`)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish')
  return url.toString()
}

export async function metaExchange(code: string): Promise<TokenSet> {
  const config = useRuntimeConfig()
  const data = await formPost(`${graph}/oauth/access_token`, {
    client_id: config.metaAppId,
    client_secret: config.metaAppSecret,
    redirect_uri: `${appBaseUrl()}/api/social/callback/meta`,
    code,
  })
  return { accessToken: readString(data, 'access_token'), expiresAt: null }
}

export async function metaAccounts(userToken: string): Promise<ConnectedAccount[]> {
  const data = await jsonRequest(`${graph}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}`, {
    token: userToken,
  })
  const pages = Array.isArray(data.data) ? data.data : []
  const accounts: ConnectedAccount[] = []
  for (const page of pages) {
    const item = page as Record<string, unknown>
    const pageId = readString(item, 'id')
    const pageToken = readString(item, 'access_token')
    if (!pageId || !pageToken) continue
    accounts.push({
      platform: 'facebook',
      externalId: pageId,
      displayName: readString(item, 'name') || 'Facebook',
      accessToken: pageToken,
      meta: { pageId },
    })
    const instagram = item.instagram_business_account as Record<string, unknown> | undefined
    if (instagram && readString(instagram, 'id')) {
      accounts.push({
        platform: 'instagram',
        externalId: readString(instagram, 'id'),
        displayName: readString(instagram, 'username') || 'Instagram',
        accessToken: pageToken,
        meta: { pageId },
      })
    }
  }
  return accounts
}

export async function metaRecent(account: ConnectedAccount): Promise<RemotePost[]> {
  if (account.platform === 'instagram') {
    const data = await jsonRequest(`${graph}/${account.externalId}/media?fields=id,caption,permalink,timestamp`, {
      token: account.accessToken,
    })
    return list(data).map(item => ({
      externalId: readString(item, 'id'),
      body: readString(item, 'caption'),
      url: readString(item, 'permalink'),
      publishedAt: dateOrNull(readString(item, 'timestamp')),
    }))
  }
  const data = await jsonRequest(`${graph}/${account.externalId}/posts?fields=id,message,permalink_url,created_time`, {
    token: account.accessToken,
  })
  return list(data).map(item => ({
    externalId: readString(item, 'id'),
    body: readString(item, 'message'),
    url: readString(item, 'permalink_url'),
    publishedAt: dateOrNull(readString(item, 'created_time')),
  }))
}

export async function metaPublish(account: ConnectedAccount, input: PublishInput, mediaId: string | null): Promise<PublishResult> {
  if (account.platform === 'instagram') {
    if (!mediaId || !input.image) throw new Error('Instagram heeft een afbeelding nodig')
    if (appBaseUrl().includes('localhost') || appBaseUrl().includes('127.0.0.1')) {
      throw new Error('Instagram heeft een publiek bereikbare afbeelding-URL nodig. Zet BETTER_AUTH_URL op een tunnel of publiek adres.')
    }
    const exp = Date.now() + 60 * 60 * 1000
    const sig = signValue(`${mediaId}.${exp}`)
    const imageUrl = `${appBaseUrl()}/api/media/${mediaId}?exp=${exp}&sig=${sig}`
    const container = await jsonRequest(`${graph}/${account.externalId}/media`, {
      method: 'POST',
      token: account.accessToken,
      body: { image_url: imageUrl, caption: input.body },
    })
    const creationId = readString(container, 'id')
    const published = await jsonRequest(`${graph}/${account.externalId}/media_publish`, {
      method: 'POST',
      token: account.accessToken,
      body: { creation_id: creationId },
    })
    return { externalId: readString(published, 'id') }
  }
  if (input.image) {
    const bytes = await readFile(absoluteMediaPath(input.image.path))
    const form = new FormData()
    form.set('caption', input.body)
    form.set('source', new Blob([bytes], { type: input.image.mime }), 'image')
    const response = await fetch(`${graph}/${account.externalId}/photos`, {
      method: 'POST',
      headers: { authorization: `Bearer ${account.accessToken}` },
      body: form,
    })
    const data = await response.json() as Record<string, unknown>
    if (!response.ok) throw new Error(readString(data, 'error') || 'Facebook-upload mislukte')
    return { externalId: readString(data, 'post_id') || readString(data, 'id') }
  }
  const data = await jsonRequest(`${graph}/${account.externalId}/feed`, {
    method: 'POST',
    token: account.accessToken,
    body: { message: input.body },
  })
  return { externalId: readString(data, 'id') }
}

function list(data: Record<string, unknown>) {
  return (Array.isArray(data.data) ? data.data : []) as Record<string, unknown>[]
}

function dateOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
