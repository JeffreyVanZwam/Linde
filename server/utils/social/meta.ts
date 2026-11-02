import { fileBlob } from '../bytes'
import { appBaseUrl, httpsBaseUrl } from '../http'
import { signValue } from '../crypto'
import { chunks, formPost, jsonRequest, readCount, readString } from './http'
import type { ConnectedAccount, OAuthApp, PostMetrics, PublishInput, PublishResult, RemotePost, TokenSet } from './types'

const graph = 'https://graph.facebook.com/v21.0'
const instagramGraph = 'https://graph.instagram.com/v21.0'

export function facebookAuthUrl(state: string, app: OAuthApp) {
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', callbackUrl('facebook'))
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts')
  return url.toString()
}

export function instagramAuthUrl(state: string, app: OAuthApp) {
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', app.clientId)
  url.searchParams.set('redirect_uri', callbackUrl('instagram'))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish')
  return url.toString()
}

function callbackUrl(provider: 'facebook' | 'instagram') {
  const base = provider === 'instagram' ? httpsBaseUrl() : appBaseUrl()
  return `${base}/api/social/callback/${provider}`
}

export async function metaExchange(code: string, app: OAuthApp): Promise<TokenSet & { shortToken: string }> {
  const data = await formPost(`${graph}/oauth/access_token`, {
    client_id: app.clientId,
    client_secret: app.clientSecret,
    redirect_uri: callbackUrl('facebook'),
    code,
  })
  const shortToken = readString(data, 'access_token')
  try {
    const long = await formPost(`${graph}/oauth/access_token`, {
      grant_type: 'fb_exchange_token',
      client_id: app.clientId,
      client_secret: app.clientSecret,
      fb_exchange_token: shortToken,
    })
    const expiresIn = Number(long.expires_in || 0)
    return {
      accessToken: readString(long, 'access_token') || shortToken,
      shortToken,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    }
  }
  catch {
    return { accessToken: shortToken, shortToken, expiresAt: null }
  }
}

export async function instagramExchange(code: string, app: OAuthApp): Promise<TokenSet & { userId: string }> {
  const data = await instagramForm('https://api.instagram.com/oauth/access_token', {
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: callbackUrl('instagram'),
    code: code.replace(/#_$/, ''),
  })
  const short = readInstagramToken(data)
  const long = await jsonRequest(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(app.clientSecret)}&access_token=${encodeURIComponent(short.accessToken)}`, {
    token: short.accessToken,
  }).catch(() => null)
  const accessToken = long ? readString(long, 'access_token') || short.accessToken : short.accessToken
  const expiresIn = Number(long?.expires_in || 0)
  return {
    accessToken,
    userId: short.userId,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date(Date.now() + 60 * 60 * 1000),
  }
}

export async function instagramProfile(token: string, userId: string) {
  const data = await jsonRequest(`${instagramGraph}/me?fields=user_id,username,name`, { token })
  return {
    externalId: readId(data, 'user_id') || readId(data, 'id') || userId,
    displayName: readString(data, 'username') || readString(data, 'name') || 'Instagram',
  }
}

async function instagramForm(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const nested = data.error
    const message = readString(data, 'error_message')
      || (nested && typeof nested === 'object' && 'message' in nested ? String(nested.message) : '')
      || readString(data, 'error_description')
      || 'Instagram-login mislukte'
    throw new Error(message)
  }
  return data
}

function readInstagramToken(data: Record<string, unknown>) {
  const nested = Array.isArray(data.data) ? data.data[0] as Record<string, unknown> : null
  const source = nested || data
  const accessToken = readString(source, 'access_token')
  if (!accessToken) throw new Error('Instagram gaf geen toegangstoken')
  return { accessToken, userId: readId(source, 'user_id') }
}

export async function metaProfile(token: string) {
  const data = await jsonRequest(`${graph}/me?fields=id,name`, { token })
  return {
    externalId: readId(data, 'id'),
    displayName: readString(data, 'name') || 'Facebook',
  }
}

export async function metaAccounts(userToken: string, app: OAuthApp, alternateToken = ''): Promise<ConnectedAccount[]> {
  const tokens = [userToken, alternateToken].filter((token, index, all) => token && all.indexOf(token) === index)
  const failures: string[] = []
  let sawPageIds = false
  for (const token of tokens) {
    const listed = [
      ...await listManagedPages(token),
      ...await businessPages(token),
    ]
    const fromList = uniqueAccounts(listed.flatMap(page => pageAccounts(page, token)))
    if (fromList.length) return stabilize(fromList, userToken)
    const ids = await selectedPageIds(token, app)
    if (ids.length) sawPageIds = true
    const resolved: ConnectedAccount[] = []
    for (const id of ids) {
      try {
        const page = await loadPage(id, token)
        resolved.push(...uniqueAccounts(pageAccounts(page, token)))
      }
      catch (error) {
        failures.push(error instanceof Error ? error.message : 'Pagina openen mislukte')
      }
    }
    if (resolved.length) return stabilize(uniqueAccounts(resolved), userToken)
  }
  if (sawPageIds) throw new Error(failures[0] || 'De gekozen Facebook-pagina is niet te openen')
  return []
}

async function listManagedPages(userToken: string) {
  const fields = ['id,name,access_token']
  for (const field of fields) {
    try {
      const rows = await pageList(userToken, field)
      if (rows.length) return rows
    }
    catch {
      // Een leeg of geweigerd paginaverzoek: probeer de volgende bron.
    }
  }
  try {
    const profile = await jsonRequest(`${graph}/me?fields=accounts.limit(100){id,name,access_token}`, { token: userToken })
    const nested = profile.accounts
    if (nested && typeof nested === 'object') return list(nested as Record<string, unknown>)
  }
  catch {
    // Geen pagina's in het profielveld.
  }
  return []
}

async function businessPages(userToken: string) {
  const rows: Record<string, unknown>[] = []
  const data = await jsonRequest(`${graph}/me/businesses?fields=id&limit=25`, { token: userToken }).catch(() => null)
  if (!data) return rows
  for (const business of list(data)) {
    const id = readId(business, 'id')
    if (!id) continue
    for (const edge of ['owned_pages', 'client_pages']) {
      const pages = await jsonRequest(`${graph}/${id}/${edge}?fields=id,name,access_token&limit=100`, { token: userToken }).catch(() => null)
      if (pages) rows.push(...list(pages))
    }
  }
  return rows
}

async function loadPage(id: string, token: string) {
  return jsonRequest(`${graph}/${id}?fields=id,name,access_token`, { token })
}

async function stabilize(accounts: ConnectedAccount[], longToken: string) {
  const tokens = new Map<string, string>()
  for (const account of accounts) {
    const pageId = account.meta?.pageId || ''
    if (!pageId || !longToken) continue
    if (!tokens.has(pageId)) {
      const page = await jsonRequest(`${graph}/${pageId}?fields=access_token`, { token: longToken }).catch(() => null)
      tokens.set(pageId, page ? readString(page, 'access_token') : '')
    }
    const stable = tokens.get(pageId)
    if (stable) account.accessToken = stable
  }
  return accounts
}

async function pageList(userToken: string, fields: string) {
  const rows: Record<string, unknown>[] = []
  let url = `${graph}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100`
  for (let page = 0; page < 5 && url; page += 1) {
    const data = await jsonRequest(url, { token: userToken })
    rows.push(...list(data))
    const paging = data.paging as { next?: string } | undefined
    url = typeof paging?.next === 'string' ? paging.next : ''
  }
  return rows
}

function uniqueAccounts(accounts: ConnectedAccount[]) {
  const seen = new Set<string>()
  return accounts.filter((account) => {
    const key = `${account.platform}:${account.externalId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pageAccounts(item: Record<string, unknown>, userToken: string) {
  const pageId = readId(item, 'id')
  if (!pageId) return []
  const pageToken = readString(item, 'access_token') || userToken
  const accounts: ConnectedAccount[] = [{
    platform: 'facebook',
    externalId: pageId,
    displayName: readString(item, 'name') || 'Facebook',
    accessToken: pageToken,
    meta: { pageId, authorType: 'organization' },
  }]
  return accounts
}

async function selectedPageIds(userToken: string, app: OAuthApp) {
  const appToken = `${app.clientId}|${app.clientSecret}`
  const data = await jsonRequest(`${graph}/debug_token?input_token=${encodeURIComponent(userToken)}&access_token=${encodeURIComponent(appToken)}`, {
    token: appToken,
  }).catch(() => null)
  const info = (data?.data || {}) as Record<string, unknown>
  const granular = Array.isArray(info.granular_scopes) ? info.granular_scopes : []
  const ids = new Set<string>()
  for (const entry of granular) {
    const row = entry as Record<string, unknown>
    if (!readString(row, 'scope').startsWith('pages_')) continue
    const rawTargets = row.target_ids
    const targets = Array.isArray(rawTargets) ? rawTargets : rawTargets ? [rawTargets] : []
    for (const id of targets) {
      if (typeof id === 'string' && id) ids.add(id)
      if (typeof id === 'number' && Number.isFinite(id)) ids.add(String(id))
    }
  }
  return [...ids]
}

function readId(data: Record<string, unknown>, key: string) {
  const value = data[key]
  if (typeof value === 'string' && value) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value))
  return ''
}

export async function metaRecent(account: ConnectedAccount): Promise<RemotePost[]> {
  const host = graphFor(account)
  if (account.platform === 'instagram') {
    const data = await jsonRequest(`${host}/${account.externalId}/media?fields=id,caption,permalink,timestamp,media_type,media_url,thumbnail_url,like_count,comments_count`, {
      token: account.accessToken,
    })
    return list(data).map(item => ({
      externalId: readString(item, 'id'),
      body: readString(item, 'caption'),
      url: readString(item, 'permalink'),
      imageUrl: instagramImage(item),
      publishedAt: dateOrNull(readString(item, 'timestamp')),
      metrics: metricsFromInstagram(item),
    }))
  }
  const data = await jsonRequest(`${host}/${account.externalId}/posts?fields=id,message,permalink_url,created_time,full_picture`, {
    token: account.accessToken,
  })
  return list(data).map(item => ({
    externalId: readString(item, 'id'),
    body: readString(item, 'message'),
    url: readString(item, 'permalink_url'),
    imageUrl: readString(item, 'full_picture') || null,
    publishedAt: dateOrNull(readString(item, 'created_time')),
  }))
}

function instagramImage(item: Record<string, unknown>) {
  const type = readString(item, 'media_type')
  const media = readString(item, 'media_url')
  const thumb = readString(item, 'thumbnail_url')
  if (type === 'VIDEO') return thumb || null
  return media || thumb || null
}

export async function metaMetrics(account: ConnectedAccount, externalIds: string[]) {
  const metrics = new Map<string, PostMetrics>()
  const warnings: string[] = []
  const host = graphFor(account)
  const instagram = account.platform === 'instagram'
  for (const group of chunks(externalIds, 20)) {
    try {
      const counts = await graphByIds(host, account.accessToken, group, instagram
        ? 'like_count,comments_count'
        : 'reactions.summary(true).limit(0),comments.summary(true).limit(0),shares')
      const insights = await insightNodes(host, account.accessToken, group, instagram, warnings)
      for (const id of group) {
        const merged = { ...nodeOf(counts, id), ...nodeOf(insights, id) }
        if (!Object.keys(merged).length) continue
        metrics.set(id, instagram ? metricsFromInstagram(merged) : metricsFromFacebook(merged))
      }
    }
    catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Meta-cijfers mislukt')
    }
  }
  return { metrics, warning: warnings[0]?.slice(0, 240) || null }
}

export async function metaPublish(account: ConnectedAccount, input: PublishInput, mediaId: string | null): Promise<PublishResult> {
  if (account.platform === 'instagram') {
    if (!mediaId || !input.image) throw new Error('Instagram heeft een afbeelding nodig')
    if (appBaseUrl().includes('localhost') || appBaseUrl().includes('127.0.0.1')) {
      throw new Error('Instagram heeft een publiek bereikbare afbeelding-URL nodig. Zet APP_URL op een tunnel of publiek adres.')
    }
    const exp = Date.now() + 60 * 60 * 1000
    const sig = signValue(`${mediaId}.${exp}`)
    const imageUrl = `${appBaseUrl()}/api/media/${mediaId}?exp=${exp}&sig=${sig}`
    const host = graphFor(account)
    const container = await jsonRequest(`${host}/${account.externalId}/media`, {
      method: 'POST',
      token: account.accessToken,
      body: { image_url: imageUrl, caption: input.body },
    })
    const creationId = readString(container, 'id')
    const published = await jsonRequest(`${host}/${account.externalId}/media_publish`, {
      method: 'POST',
      token: account.accessToken,
      body: { creation_id: creationId },
    })
    return { externalId: readString(published, 'id') }
  }
  if (input.image) {
    const form = new FormData()
    form.set('caption', input.body)
    form.set('source', fileBlob(input.image.bytes, input.image.mime), 'image')
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

async function graphByIds(host: string, token: string, ids: string[], fields: string) {
  return jsonRequest(`${host}/?ids=${ids.map(encodeURIComponent).join(',')}&fields=${encodeURIComponent(fields)}`, { token })
}

async function insightNodes(host: string, token: string, ids: string[], instagram: boolean, warnings: string[]) {
  const primary = instagram
    ? 'insights.metric(reach,saved,views)'
    : 'insights.metric(post_impressions,post_impressions_unique,post_clicks)'
  const fallback = instagram
    ? 'insights.metric(reach,saved,impressions)'
    : 'insights.metric(post_media_view)'
  try {
    return await graphByIds(host, token, ids, primary)
  }
  catch (error) {
    try {
      return await graphByIds(host, token, ids, fallback)
    }
    catch {
      warnings.push(error instanceof Error ? error.message : 'Insights mislukt')
      return null
    }
  }
}

function nodeOf(data: Record<string, unknown> | null, id: string) {
  if (!data) return {}
  const value = data[id]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  if (record.error) return {}
  return record
}

function metricsFromFacebook(item: Record<string, unknown>): PostMetrics {
  const reactions = item.reactions as { summary?: { total_count?: unknown } } | undefined
  const comments = item.comments as { summary?: { total_count?: unknown } } | undefined
  const shares = item.shares as { count?: unknown } | undefined
  return {
    impressions: insight(item, 'post_impressions') ?? insight(item, 'post_media_view'),
    reach: insight(item, 'post_impressions_unique'),
    likes: readCount(reactions?.summary?.total_count),
    comments: readCount(comments?.summary?.total_count),
    shares: readCount(shares?.count),
    saves: null,
    clicks: insight(item, 'post_clicks'),
  }
}

function metricsFromInstagram(item: Record<string, unknown>): PostMetrics {
  return {
    impressions: insight(item, 'views') ?? insight(item, 'impressions'),
    reach: insight(item, 'reach'),
    likes: readCount(item.like_count),
    comments: readCount(item.comments_count),
    shares: insight(item, 'shares'),
    saves: insight(item, 'saved'),
    clicks: null,
  }
}

function insight(item: Record<string, unknown>, name: string) {
  const insights = item.insights as { data?: Array<Record<string, unknown>> } | undefined
  const row = insights?.data?.find(entry => entry.name === name)
  const values = Array.isArray(row?.values) ? row.values as Array<Record<string, unknown>> : []
  return readCount(values[0]?.value)
}

function graphFor(account: ConnectedAccount) {
  return account.platform === 'instagram' && account.meta?.auth === 'instagram' ? instagramGraph : graph
}

function list(data: Record<string, unknown>) {
  return (Array.isArray(data.data) ? data.data : []) as Record<string, unknown>[]
}

function dateOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
