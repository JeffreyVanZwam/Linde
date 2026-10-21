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

async function byUser(collection: string, userId: string, sort?: string) {
  return listRecords(collection, { filter: await filterOf('user = {:user}', { user: userId }), sort })
}

export async function findBrand(userId: string) {
  const row = await firstRecord('brands', await filterOf('user = {:user}', { user: userId }))
  return row ? mapBrand(row) : null
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
  }
  if (existing) await updateRecord('brands', existing.id, data)
  else await createRecord('brands', { user: userId, ...data })
}

export async function listConversations(userId: string, module?: string) {
  const filter = module
    ? await filterOf('user = {:user} && module = {:module}', { user: userId, module })
    : await filterOf('user = {:user}', { user: userId })
  const rows = await listRecords('conversations', { filter, sort: '-updated' })
  return rows.map(mapConversation)
}

export async function findConversation(id: string, userId?: string) {
  const row = await oneRecord('conversations', id)
  if (!row) return null
  const mapped = mapConversation(row)
  if (userId && mapped.userId !== userId) return null
  return mapped
}

export async function createConversation(input: { userId: string, module: string, title: string }) {
  const row = await createRecord('conversations', {
    user: input.userId,
    module: input.module,
    title: input.title,
  })
  return row.id
}

export async function touchConversation(id: string) {
  await updateRecord('conversations', id, { title: (await oneRecord('conversations', id))?.title || '' })
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

export async function listSocialAccounts(userId: string) {
  return (await byUser('social_accounts', userId)).map(mapAccount)
}

export async function findSocialAccount(id: string) {
  const row = await oneRecord('social_accounts', id)
  return row ? mapAccount(row) : null
}

export async function findSocialAccountMatch(userId: string, platform: string, externalId: string) {
  const row = await firstRecord('social_accounts', await filterOf(
    'user = {:user} && platform = {:platform} && externalId = {:externalId}',
    { user: userId, platform, externalId },
  ))
  return row ? mapAccount(row) : null
}

export async function createSocialAccount(input: {
  userId: string
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

export async function listPosts(userId: string, limit = 500) {
  const rows = await listRecords('social_posts', {
    filter: await filterOf('user = {:user}', { user: userId }),
    sort: '-created',
  })
  return rows.slice(0, limit).map(mapPost)
}

export async function findPost(id: string, userId?: string) {
  const row = await oneRecord('social_posts', id)
  if (!row) return null
  const mapped = mapPost(row)
  if (userId && mapped.userId !== userId) return null
  return mapped
}

export async function listDuePosts() {
  const rows = await listRecords('social_posts', { filter: 'status = "scheduled"' })
  const now = Date.now()
  return rows.map(mapPost).filter(post => post.scheduledAt && post.scheduledAt.getTime() <= now)
}

export async function createPost(input: {
  userId: string
  conversationId?: string | null
  body: string
  mediaAssetId?: string | null
  status: string
  source: string
  scheduledAt?: Date | null
  duplicateWarning?: string | null
}) {
  const data: Record<string, unknown> = {
    user: input.userId,
    body: input.body,
    status: input.status,
    source: input.source,
    duplicateWarning: input.duplicateWarning || '',
  }
  if (input.conversationId) data.conversation = input.conversationId
  if (input.mediaAssetId) data.media = input.mediaAssetId
  if (input.scheduledAt) data.scheduledAt = input.scheduledAt.toISOString()
  const row = await createRecord('social_posts', data)
  return row.id
}

export async function updatePost(id: string, patch: Partial<{
  body: string
  mediaAssetId: string | null
  status: string
  scheduledAt: Date | null
  duplicateWarning: string | null
}>) {
  const data: Record<string, unknown> = {}
  if (patch.body !== undefined) data.body = patch.body
  if (patch.mediaAssetId !== undefined) data.media = patch.mediaAssetId || ''
  if (patch.status !== undefined) data.status = patch.status
  if (patch.scheduledAt !== undefined) data.scheduledAt = iso(patch.scheduledAt)
  if (patch.duplicateWarning !== undefined) data.duplicateWarning = patch.duplicateWarning || ''
  await updateRecord('social_posts', id, data)
}

export async function deletePosts(ids: string[]) {
  for (const id of ids) await removeRecord('social_posts', id)
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
}>) {
  const data: Record<string, unknown> = {}
  if (patch.body !== undefined) data.body = patch.body
  if (patch.title !== undefined) data.title = patch.title || ''
  if (patch.status !== undefined) data.status = patch.status
  if (patch.externalId !== undefined) data.externalId = patch.externalId || ''
  if (patch.externalUrl !== undefined) data.externalUrl = patch.externalUrl || ''
  if (patch.error !== undefined) data.error = patch.error || ''
  if (patch.publishedAt !== undefined) data.publishedAt = iso(patch.publishedAt)
  await updateRecord('social_post_targets', id, data)
}

export async function deleteTargetsForPost(postId: string) {
  await removeFiltered('social_post_targets', await filterOf('post = {:id}', { id: postId }))
}

export async function deleteTargets(ids: string[]) {
  for (const id of ids) await removeRecord('social_post_targets', id)
}

export async function listSiteArticles(userId: string) {
  return (await byUser('site_articles', userId)).map(mapArticle)
}

export async function replaceSiteArticles(userId: string, rows: Array<{ url: string, title: string, excerpt: string }>) {
  await removeFiltered('site_articles', await filterOf('user = {:user}', { user: userId }))
  for (const row of rows) {
    await createRecord('site_articles', {
      user: userId,
      url: row.url,
      title: row.title,
      excerpt: row.excerpt,
    })
  }
}

export async function listDrafts(userId: string) {
  const rows = await listRecords('article_drafts', {
    filter: await filterOf('user = {:user}', { user: userId }),
    sort: '-updated',
  })
  return rows.map(mapDraft)
}

export async function findDraft(id: string, userId: string) {
  const row = await oneRecord('article_drafts', id)
  if (!row) return null
  const mapped = mapDraft(row)
  return mapped.userId === userId ? mapped : null
}

export async function createDraft(input: {
  userId: string
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

export async function findSmtp(userId: string) {
  const row = await firstRecord('smtp_connections', await filterOf('user = {:user}', { user: userId }))
  return row ? mapSmtp(row) : null
}

export async function saveSmtp(userId: string, existing: SmtpRow | null, values: {
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
  else await createRecord('smtp_connections', { user: userId, ...data })
}

export async function listCampaigns(userId: string) {
  const rows = await listRecords('outreach_campaigns', {
    filter: await filterOf('user = {:user}', { user: userId }),
    sort: '-updated',
  })
  return rows.map(mapCampaign)
}

export async function findCampaign(id: string, userId?: string) {
  const row = await oneRecord('outreach_campaigns', id)
  if (!row) return null
  const mapped = mapCampaign(row)
  if (userId && mapped.userId !== userId) return null
  return mapped
}

export async function createCampaign(input: {
  userId: string
  conversationId?: string | null
  name: string
  goal?: string | null
  audience?: string | null
  offer?: string | null
  status: string
}) {
  const data: Record<string, unknown> = {
    user: input.userId,
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

export async function ensureFolder(userId: string, name: string, parentId: string | null = null) {
  const key = `${userId}:${parentId || ''}:${name}`
  const pending = folderLocks.get(key)
  if (pending) return pending
  const job = (async () => {
    const parent = parentId || ''
    const existing = await firstRecord('folders', await filterOf(
      'user = {:user} && name = {:name} && parent = {:parent}',
      { user: userId, name, parent },
    ))
    if (existing) return existing.id
    const created = await createRecord('folders', { user: userId, name, parent })
    return created.id
  })().finally(() => folderLocks.delete(key))
  folderLocks.set(key, job)
  return job
}

export async function listFolders(userId: string) {
  return (await byUser('folders', userId, 'name')).map(mapFolder)
}

export async function findFolder(id: string, userId?: string) {
  const row = await oneRecord('folders', id)
  if (!row) return null
  const mapped = mapFolder(row)
  if (userId && mapped.userId !== userId) return null
  return mapped
}

export async function createFolder(userId: string, name: string, parentId: string | null) {
  const row = await createRecord('folders', { user: userId, name, parent: parentId || '' })
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

export async function listFilesIn(userId: string, folderId: string | null) {
  const filter = await filterOf('user = {:user} && folder = {:folder}', { user: userId, folder: folderId || '' })
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
