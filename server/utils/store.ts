import type { BrandDossier } from '~~/shared/dossier'
import { createRecord, filterOf, firstRecord, listRecords, oneRecord, removeFiltered, removeRecord, updateRecord } from './pb'
import {
  iso,
  mapAccount,
  mapArticle,
  mapBrand,
  mapCampaign,
  mapConversation,
  mapDraft,
  mapFolder,
  mapMedia,
  mapMessage,
  mapOutreachMessage,
  mapPost,
  mapRecipient,
  mapSmtp,
  mapStep,
  mapTarget,
  type ArticleDraftRow,
  type BrandRow,
  type CampaignRow,
  type ConversationRow,
  type FolderRow,
  type MediaRow,
  type MessageRow,
  type OutreachMessageRow,
  type RecipientRow,
  type SiteArticleRow,
  type SmtpRow,
  type SocialAccountRow,
  type SocialPostRow,
  type SocialTargetRow,
  type StepRow,
} from './rows'

const brandPalette = ['#1F6B4A', '#7A3E6D', '#C4A574', '#2F6F6A', '#8C4A2F', '#3D5A80']

function relationId(value: unknown) {
  return typeof value === 'string' && value ? value : ''
}

async function byOwner(collection: string, userId: string, brandId: string, sort?: string) {
  return listRecords(collection, {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort,
  })
}

export async function listBrandRows(userId: string) {
  const rows = await listRecords('brands', {
    filter: await filterOf('user = {:user}', { user: userId }),
    sort: 'position,created',
  })
  return rows.map(mapBrand)
}

export async function ensureActiveBrand(userId: string) {
  const rows = await listBrandRows(userId)
  if (!rows.length) return null
  const user = await oneRecord('users', userId)
  const currentId = relationId(user?.activeBrand)
  const current = rows.find(row => row.id === currentId && !row.archived)
  if (current) return current
  const next = rows.find(row => !row.archived) || rows[0]
  if (!next) return null
  await updateRecord('users', userId, { activeBrand: next.id })
  return next
}

export async function setActiveBrand(userId: string, brandId: string) {
  const rows = await listBrandRows(userId)
  const brand = rows.find(row => row.id === brandId)
  if (!brand || brand.archived) return null
  await updateRecord('users', userId, { activeBrand: brand.id })
  return brand
}

export async function createBrandRow(userId: string, companyName: string) {
  const rows = await listBrandRows(userId)
  const row = await createRecord('brands', {
    user: userId,
    companyName,
    color: brandPalette[rows.length % brandPalette.length],
    position: rows.length,
    archived: false,
    onboardingCompleted: false,
    writingRules: [],
  })
  await updateRecord('users', userId, { activeBrand: row.id })
  return mapBrand(row)
}

export async function updateBrandMeta(id: string, patch: Partial<{ companyName: string, color: string, archived: boolean, position: number }>) {
  const data: Record<string, unknown> = {}
  if (patch.companyName !== undefined) data.companyName = patch.companyName
  if (patch.color !== undefined) data.color = patch.color
  if (patch.archived !== undefined) data.archived = patch.archived
  if (patch.position !== undefined) data.position = patch.position
  await updateRecord('brands', id, data)
}

export async function reorderBrands(userId: string, ids: string[]) {
  const rows = await listBrandRows(userId)
  const owned = new Set(rows.map(row => row.id))
  let position = 0
  for (const id of ids) {
    if (!owned.has(id)) continue
    await updateRecord('brands', id, { position })
    position += 1
  }
}

export async function deleteBrandRow(id: string) {
  await removeRecord('brands', id)
}

export async function saveWritingRules(id: string, rules: unknown) {
  await updateRecord('brands', id, { writingRules: rules })
}

export async function findBrand(userId: string) {
  return ensureActiveBrand(userId)
}

export async function saveBrandRecord(userId: string, existing: BrandRow | null, values: {
  websiteUrl: string | null
  companyName: string | null
  logoMediaId: string | null
  imageIds: string[]
  colors: string[]
  fonts: string[]
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  articlesUrl: string | null
  onboardingCompleted: boolean
  dossier: BrandDossier | null
}) {
  const data = {
    websiteUrl: values.websiteUrl || '',
    companyName: values.companyName || '',
    logo: values.logoMediaId || '',
    images: values.imageIds,
    colors: values.colors,
    fonts: values.fonts,
    whoTheyAre: values.whoTheyAre || '',
    whatTheyDo: values.whatTheyDo || '',
    audience: values.audience || '',
    toneOfVoice: values.toneOfVoice || '',
    articlesUrl: values.articlesUrl || '',
    onboardingCompleted: values.onboardingCompleted,
    dossier: values.dossier,
  }
  if (existing) await updateRecord('brands', existing.id, data)
  else {
    const rows = await listBrandRows(userId)
    const row = await createRecord('brands', {
      user: userId,
      color: brandPalette[rows.length % brandPalette.length],
      position: rows.length,
      archived: false,
      writingRules: [],
      ...data,
    })
    await updateRecord('users', userId, { activeBrand: row.id })
  }
}

export async function listConversations(userId: string, brandId: string, module?: string) {
  const filter = module
    ? await filterOf('user = {:user} && brand = {:brand} && module = {:module}', { user: userId, brand: brandId, module })
    : await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId })
  const rows = await listRecords('conversations', { filter, sort: '-updated' })
  return rows.map(mapConversation)
}

export async function findConversation(id: string, userId?: string, brandId?: string) {
  const row = await oneRecord('conversations', id)
  if (!row) return null
  const mapped = mapConversation(row)
  if (userId && mapped.userId !== userId) return null
  if (brandId && mapped.brandId !== brandId) return null
  return mapped
}

export async function createConversation(input: { userId: string, brandId: string, module: string, title: string }) {
  const row = await createRecord('conversations', {
    user: input.userId,
    brand: input.brandId,
    module: input.module,
    title: input.title,
  })
  return row.id
}

export async function touchConversation(id: string) {
  await updateRecord('conversations', id, { title: (await oneRecord('conversations', id))?.title || '' })
}

export async function renameConversation(id: string, title: string) {
  await updateRecord('conversations', id, { title })
}

export async function deleteConversation(id: string) {
  await removeFiltered('messages', await filterOf('conversation = {:id}', { id }))
  await removeRecord('conversations', id)
}

export async function listMessages(conversationId: string) {
  const rows = await listRecords('messages', {
    filter: await filterOf('conversation = {:id}', { id: conversationId }),
    sort: 'created',
  })
  return rows.map(mapMessage)
}

export async function createMessage(input: { conversationId: string, role: string, content: string }) {
  const row = await createRecord('messages', {
    conversation: input.conversationId,
    role: input.role,
    content: input.content,
  })
  return row.id
}

export async function listSocialAccounts(userId: string, brandId: string) {
  return (await byOwner('social_accounts', userId, brandId)).map(mapAccount)
}

export async function listAllSocialAccounts() {
  return (await listRecords('social_accounts')).map(mapAccount)
}

export async function findSocialAccount(id: string) {
  const row = await oneRecord('social_accounts', id)
  return row ? mapAccount(row) : null
}

export async function findSocialAccountMatch(brandId: string, platform: string, externalId: string) {
  const row = await firstRecord('social_accounts', await filterOf(
    'brand = {:brand} && platform = {:platform} && externalId = {:externalId}',
    { brand: brandId, platform, externalId },
  ))
  return row ? mapAccount(row) : null
}

export async function createSocialAccount(input: {
  userId: string
  brandId: string
  platform: string
  externalId: string
  displayName: string
  accessTokenEnc: string
  refreshTokenEnc: string | null
  expiresAt: Date | null
  metaJson: string
}) {
  const row = await createRecord('social_accounts', {
    user: input.userId,
    brand: input.brandId,
    platform: input.platform,
    externalId: input.externalId,
    displayName: input.displayName,
    accessTokenEnc: input.accessTokenEnc,
    refreshTokenEnc: input.refreshTokenEnc || '',
    expiresAt: iso(input.expiresAt),
    meta: JSON.parse(input.metaJson),
  })
  return row.id
}

export async function updateSocialAccount(id: string, patch: Partial<{
  displayName: string
  accessTokenEnc: string
  refreshTokenEnc: string | null
  expiresAt: Date | null
  metaJson: string
  lastSyncAt: Date | null
}>) {
  const data: Record<string, unknown> = {}
  if (patch.displayName !== undefined) data.displayName = patch.displayName
  if (patch.accessTokenEnc !== undefined) data.accessTokenEnc = patch.accessTokenEnc
  if (patch.refreshTokenEnc !== undefined) data.refreshTokenEnc = patch.refreshTokenEnc || ''
  if (patch.expiresAt !== undefined) data.expiresAt = iso(patch.expiresAt)
  if (patch.metaJson !== undefined) data.meta = JSON.parse(patch.metaJson)
  if (patch.lastSyncAt !== undefined) data.lastSyncAt = iso(patch.lastSyncAt)
  await updateRecord('social_accounts', id, data)
}

export async function deleteSocialAccount(id: string) {
  await removeRecord('social_accounts', id)
}

export async function findMedia(id: string) {
  const row = await oneRecord('library_files', id)
  return row ? mapMedia(row) : null
}

export async function listMedia(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  const rows = []
  for (let index = 0; index < unique.length; index += 40) {
    const chunk = unique.slice(index, index + 40)
    const filter = chunk.map(id => `id = "${id}"`).join(' || ')
    rows.push(...await listRecords('library_files', { filter }))
  }
  return rows.map(mapMedia)
}

export async function listPosts(userId: string, brandId: string, limit = 500) {
  const rows = await listRecords('social_posts', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-created',
  })
  return rows.slice(0, limit).map(mapPost)
}

export async function findPost(id: string, userId?: string, brandId?: string) {
  const row = await oneRecord('social_posts', id)
  if (!row) return null
  const mapped = mapPost(row)
  if (userId && mapped.userId !== userId) return null
  if (brandId && mapped.brandId !== brandId) return null
  return mapped
}

export async function listDuePosts() {
  const rows = await listRecords('social_posts', { filter: 'status = "scheduled"' })
  const now = Date.now()
  return rows.map(mapPost).filter(post => post.scheduledAt && post.scheduledAt.getTime() <= now)
}

export async function createPost(input: {
  userId: string
  brandId: string
  conversationId?: string | null
  body: string
  mediaAssetId?: string | null
  imageUrl?: string | null
  status: string
  source: string
  scheduledAt?: Date | null
  duplicateWarning?: string | null
  angle?: string | null
}) {
  const data: Record<string, unknown> = {
    user: input.userId,
    brand: input.brandId,
    body: input.body,
    status: input.status,
    source: input.source,
    duplicateWarning: input.duplicateWarning || '',
    angle: input.angle || '',
  }
  if (input.conversationId) data.conversation = input.conversationId
  if (input.mediaAssetId) data.media = input.mediaAssetId
  if (input.imageUrl) data.imageUrl = input.imageUrl
  if (input.scheduledAt) data.scheduledAt = input.scheduledAt.toISOString()
  const row = await createRecord('social_posts', data)
  return row.id
}

export async function updatePost(id: string, patch: Partial<{
  body: string
  mediaAssetId: string | null
  imageUrl: string | null
  status: string
  scheduledAt: Date | null
  duplicateWarning: string | null
}>) {
  const data: Record<string, unknown> = {}
  if (patch.body !== undefined) data.body = patch.body
  if (patch.mediaAssetId !== undefined) data.media = patch.mediaAssetId || ''
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl || ''
  if (patch.status !== undefined) data.status = patch.status
  if (patch.scheduledAt !== undefined) data.scheduledAt = iso(patch.scheduledAt)
  if (patch.duplicateWarning !== undefined) data.duplicateWarning = patch.duplicateWarning || ''
  await updateRecord('social_posts', id, data)
}

export async function deletePosts(ids: string[]) {
  for (const id of ids) await removeRecord('social_posts', id)
}

export async function setOpenTargetsStatus(postId: string, status: 'scheduled' | 'draft') {
  const targets = await listTargetsForPost(postId)
  for (const target of targets) {
    if (target.status === 'published' || target.status === 'failed') continue
    await updateTarget(target.id, { status })
  }
}

export async function listTargetsForPosts(postIds: string[]) {
  if (!postIds.length) return []
  const filter = postIds.map(id => `post = "${id}"`).join(' || ')
  return (await listRecords('social_post_targets', { filter })).map(mapTarget)
}

export async function listTargetsForPost(postId: string) {
  return listTargetsForPosts([postId])
}

export async function listTargetsForAccount(accountId: string) {
  const rows = await listRecords('social_post_targets', {
    filter: await filterOf('account = {:id}', { id: accountId }),
  })
  return rows.map(mapTarget)
}

export async function findTargetByExternal(accountId: string, externalId: string) {
  const row = await firstRecord('social_post_targets', await filterOf(
    'account = {:account} && externalId = {:externalId}',
    { account: accountId, externalId },
  ))
  return row ? mapTarget(row) : null
}

export async function createTarget(input: {
  postId: string
  accountId?: string | null
  platform: string
  body: string
  title?: string | null
  status: string
  externalId?: string | null
  externalUrl?: string | null
  publishedAt?: Date | null
  impressions?: number | null
  reach?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  clicks?: number | null
  metricsAt?: Date | null
}) {
  const data: Record<string, unknown> = {
    post: input.postId,
    platform: input.platform,
    body: input.body,
    title: input.title || '',
    status: input.status,
    externalId: input.externalId || '',
    externalUrl: input.externalUrl || '',
  }
  if (input.accountId) data.account = input.accountId
  if (input.publishedAt) data.publishedAt = input.publishedAt.toISOString()
  assignMetrics(data, input)
  const row = await createRecord('social_post_targets', data)
  return row.id
}

export async function updateTarget(id: string, patch: Partial<{
  body: string
  title: string | null
  status: string
  externalId: string | null
  externalUrl: string | null
  error: string | null
  publishedAt: Date | null
  impressions: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  clicks: number | null
  metricsAt: Date | null
}>) {
  const data: Record<string, unknown> = {}
  if (patch.body !== undefined) data.body = patch.body
  if (patch.title !== undefined) data.title = patch.title || ''
  if (patch.status !== undefined) data.status = patch.status
  if (patch.externalId !== undefined) data.externalId = patch.externalId || ''
  if (patch.externalUrl !== undefined) data.externalUrl = patch.externalUrl || ''
  if (patch.error !== undefined) data.error = patch.error || ''
  if (patch.publishedAt !== undefined) data.publishedAt = iso(patch.publishedAt)
  assignMetrics(data, patch)
  await updateRecord('social_post_targets', id, data)
}

const metricKeys = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks'] as const

function assignMetrics(data: Record<string, unknown>, source: Partial<Record<(typeof metricKeys)[number], number | null | undefined>> & { metricsAt?: Date | null }) {
  for (const key of metricKeys) {
    if (source[key] !== undefined) data[key] = source[key]
  }
  if (source.metricsAt !== undefined) data.metricsAt = iso(source.metricsAt)
}

export async function deleteTargetsForPost(postId: string) {
  await removeFiltered('social_post_targets', await filterOf('post = {:id}', { id: postId }))
}

export async function deleteTargets(ids: string[]) {
  for (const id of ids) await removeRecord('social_post_targets', id)
}

export async function listSiteArticles(userId: string, brandId: string) {
  return (await byOwner('site_articles', userId, brandId)).map(mapArticle)
}

export async function replaceSiteArticles(userId: string, brandId: string, rows: Array<{ url: string, title: string, excerpt: string }>) {
  await removeFiltered('site_articles', await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }))
  for (const row of rows) {
    await createRecord('site_articles', {
      user: userId,
      brand: brandId,
      url: row.url,
      title: row.title,
      excerpt: row.excerpt,
    })
  }
}

export async function listDrafts(userId: string, brandId: string) {
  const rows = await listRecords('article_drafts', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-updated',
  })
  return rows.map(mapDraft)
}

export async function findDraft(id: string, userId: string, brandId?: string) {
  const row = await oneRecord('article_drafts', id)
  if (!row) return null
  const mapped = mapDraft(row)
  if (mapped.userId !== userId) return null
  if (brandId && mapped.brandId !== brandId) return null
  return mapped
}

export async function updateDraft(id: string, patch: Partial<{
  title: string
  metaTitle: string
  metaDescription: string
  markdown: string
  faq: unknown
  keywords: unknown
  geoNotes: string
}>) {
  const data: Record<string, unknown> = {}
  if (patch.title !== undefined) data.title = patch.title
  if (patch.metaTitle !== undefined) data.metaTitle = patch.metaTitle
  if (patch.metaDescription !== undefined) data.metaDescription = patch.metaDescription
  if (patch.markdown !== undefined) data.markdown = patch.markdown
  if (patch.faq !== undefined) data.faq = patch.faq
  if (patch.keywords !== undefined) data.keywords = patch.keywords
  if (patch.geoNotes !== undefined) data.geoNotes = patch.geoNotes
  await updateRecord('article_drafts', id, data)
}

export async function createDraft(input: {
  userId: string
  brandId: string
  conversationId?: string | null
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  markdown: string
  faq: unknown
  jsonLd: unknown
  keywords: unknown
  internalLinks: unknown
  geoNotes: string
}) {
  const data: Record<string, unknown> = {
    user: input.userId,
    brand: input.brandId,
    title: input.title,
    slug: input.slug,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    markdown: input.markdown,
    faq: input.faq,
    jsonLd: input.jsonLd,
    keywords: input.keywords,
    internalLinks: input.internalLinks,
    geoNotes: input.geoNotes,
  }
  if (input.conversationId) data.conversation = input.conversationId
  const row = await createRecord('article_drafts', data)
  return row.id
}

export async function findSmtp(userId: string, brandId: string) {
  const row = await firstRecord('smtp_connections', await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }))
  return row ? mapSmtp(row) : null
}

export async function saveSmtp(userId: string, brandId: string, existing: SmtpRow | null, values: {
  host: string
  port: number
  secure: boolean
  username: string
  passwordEnc: string
  fromEmail: string
  fromName: string | null
  imapHost: string | null
  imapPort: number | null
  imapSecure: boolean | null
}) {
  const data = {
    host: values.host,
    port: values.port,
    secure: values.secure,
    username: values.username,
    passwordEnc: values.passwordEnc,
    fromEmail: values.fromEmail,
    fromName: values.fromName || '',
    imapHost: values.imapHost || '',
    imapPort: values.imapPort || 0,
    imapSecure: values.imapSecure ?? false,
  }
  if (existing) await updateRecord('smtp_connections', existing.id, data)
  else await createRecord('smtp_connections', { user: userId, brand: brandId, ...data })
}

export async function listCampaigns(userId: string, brandId: string) {
  const rows = await listRecords('outreach_campaigns', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-updated',
  })
  return rows.map(mapCampaign)
}

export async function findCampaign(id: string, userId?: string, brandId?: string) {
  const row = await oneRecord('outreach_campaigns', id)
  if (!row) return null
  const mapped = mapCampaign(row)
  if (userId && mapped.userId !== userId) return null
  if (brandId && mapped.brandId !== brandId) return null
  return mapped
}

export async function createCampaign(input: {
  userId: string
  brandId: string
  conversationId?: string | null
  name: string
  goal?: string | null
  audience?: string | null
  offer?: string | null
  status: string
}) {
  const data: Record<string, unknown> = {
    user: input.userId,
    brand: input.brandId,
    name: input.name,
    goal: input.goal || '',
    audience: input.audience || '',
    offer: input.offer || '',
    status: input.status,
  }
  if (input.conversationId) data.conversation = input.conversationId
  const row = await createRecord('outreach_campaigns', data)
  return row.id
}

export async function updateCampaign(id: string, patch: Partial<{ status: string }>) {
  await updateRecord('outreach_campaigns', id, patch)
}

export async function listSteps(campaignId: string) {
  const rows = await listRecords('outreach_steps', {
    filter: await filterOf('campaign = {:id}', { id: campaignId }),
    sort: 'position',
  })
  return rows.map(mapStep)
}

export async function createStep(input: { campaignId: string, position: number, delayHours: number, subject: string, body: string }) {
  const row = await createRecord('outreach_steps', {
    campaign: input.campaignId,
    position: input.position,
    delayHours: input.delayHours,
    subject: input.subject,
    body: input.body,
  })
  return row.id
}

export async function listRecipients(campaignId: string, status?: string) {
  const filter = status
    ? await filterOf('campaign = {:id} && status = {:status}', { id: campaignId, status })
    : await filterOf('campaign = {:id}', { id: campaignId })
  return (await listRecords('outreach_recipients', { filter })).map(mapRecipient)
}

export async function findRecipient(id: string) {
  const row = await oneRecord('outreach_recipients', id)
  return row ? mapRecipient(row) : null
}

export async function createRecipients(rows: Array<{ campaignId: string, email: string, name: string | null, status: string, currentStep: number }>) {
  for (const row of rows) {
    await createRecord('outreach_recipients', {
      campaign: row.campaignId,
      email: row.email,
      name: row.name || '',
      status: row.status,
      currentStep: row.currentStep,
    })
  }
}

export async function updateRecipient(id: string, patch: Partial<{ status: string }>) {
  await updateRecord('outreach_recipients', id, patch)
}

export async function listOutreachMessages(campaignId: string) {
  const rows = await listRecords('outreach_messages', {
    filter: await filterOf('campaign = {:id}', { id: campaignId }),
  })
  return rows.map(mapOutreachMessage)
}

export async function findOutreachMessage(id: string) {
  const row = await oneRecord('outreach_messages', id)
  return row ? mapOutreachMessage(row) : null
}

export async function listActionableOutreach() {
  const rows = await listRecords('outreach_messages', {
    filter: 'status = "approved" || status = "scheduled"',
  })
  return rows.map(mapOutreachMessage).filter(message => message.scheduledAt && message.scheduledAt.getTime() <= Date.now())
}

export async function listSentSince(campaignIds: string[], start: Date) {
  if (!campaignIds.length) return []
  const filter = `(${campaignIds.map(id => `campaign = "${id}"`).join(' || ')}) && status = "sent"`
  const rows = await listRecords('outreach_messages', { filter })
  return rows.map(mapOutreachMessage).filter(message => message.sentAt && message.sentAt.getTime() >= start.getTime())
}

export async function createOutreachMessages(rows: Array<{
  campaignId: string
  recipientId: string
  stepId: string | null
  subject: string
  body: string
  status: string
  scheduledAt: Date | null
}>) {
  for (const row of rows) {
    const data: Record<string, unknown> = {
      campaign: row.campaignId,
      recipient: row.recipientId,
      subject: row.subject,
      body: row.body,
      status: row.status,
    }
    if (row.stepId) data.step = row.stepId
    if (row.scheduledAt) data.scheduledAt = row.scheduledAt.toISOString()
    await createRecord('outreach_messages', data)
  }
}

export async function updateOutreachMessage(id: string, patch: Partial<{
  status: string
  scheduledAt: Date | null
  subject: string
  body: string
  sentAt: Date | null
  messageId: string | null
  error: string | null
}>) {
  const data: Record<string, unknown> = {}
  if (patch.status !== undefined) data.status = patch.status
  if (patch.scheduledAt !== undefined) data.scheduledAt = iso(patch.scheduledAt)
  if (patch.subject !== undefined) data.subject = patch.subject
  if (patch.body !== undefined) data.body = patch.body
  if (patch.sentAt !== undefined) data.sentAt = iso(patch.sentAt)
  if (patch.messageId !== undefined) data.messageId = patch.messageId || ''
  if (patch.error !== undefined) data.error = patch.error || ''
  await updateRecord('outreach_messages', id, data)
}

export async function cancelOpenMessages(recipientId: string) {
  const rows = await listRecords('outreach_messages', {
    filter: await filterOf('recipient = {:id}', { id: recipientId }),
  })
  for (const row of rows.map(mapOutreachMessage)) {
    if (['draft', 'approved', 'scheduled'].includes(row.status)) {
      await updateRecord('outreach_messages', row.id, { status: 'cancelled' })
    }
  }
}

const folderLocks = new Map<string, Promise<string>>()

export async function ensureFolder(userId: string, brandId: string, name: string, parentId: string | null = null) {
  const key = `${brandId}:${parentId || ''}:${name}`
  const pending = folderLocks.get(key)
  if (pending) return pending
  const job = (async () => {
    const parent = parentId || ''
    const existing = await firstRecord('folders', await filterOf(
      'user = {:user} && brand = {:brand} && name = {:name} && parent = {:parent}',
      { user: userId, brand: brandId, name, parent },
    ))
    if (existing) return existing.id
    const created = await createRecord('folders', { user: userId, brand: brandId, name, parent })
    return created.id
  })().finally(() => folderLocks.delete(key))
  folderLocks.set(key, job)
  return job
}

export async function listFolders(userId: string, brandId: string) {
  return (await byOwner('folders', userId, brandId, 'name')).map(mapFolder)
}

export async function findFolder(id: string, userId?: string, brandId?: string) {
  const row = await oneRecord('folders', id)
  if (!row) return null
  const mapped = mapFolder(row)
  if (userId && mapped.userId !== userId) return null
  if (brandId && mapped.brandId !== brandId) return null
  return mapped
}

export async function createFolder(userId: string, brandId: string, name: string, parentId: string | null) {
  const row = await createRecord('folders', { user: userId, brand: brandId, name, parent: parentId || '' })
  return row.id
}

export async function updateFolder(id: string, patch: { name?: string, parentId?: string | null }) {
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.parentId !== undefined) data.parent = patch.parentId || ''
  await updateRecord('folders', id, data)
}

export async function deleteFolder(id: string) {
  await removeRecord('folders', id)
}

export async function listFilesIn(userId: string, brandId: string, folderId: string | null) {
  const filter = await filterOf('user = {:user} && brand = {:brand} && folder = {:folder}', { user: userId, brand: brandId, folder: folderId || '' })
  const rows = await listRecords('library_files', { filter, sort: '-created' })
  return rows.map(mapMedia)
}

export async function updateLibraryFile(id: string, patch: { name?: string, folderId?: string | null }) {
  const data: Record<string, unknown> = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.folderId !== undefined) data.folder = patch.folderId || ''
  await updateRecord('library_files', id, data)
}

export async function deleteLibraryFile(id: string) {
  await removeRecord('library_files', id)
}
