import type { PbRecord } from './pb'

export type BrandRow = {
  id: string
  userId: string
  websiteUrl: string | null
  companyName: string | null
  logoMediaId: string | null
  imageIdsJson: string
  colorsJson: string
  fontsJson: string
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  articlesUrl: string | null
  onboardingCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export type ConversationRow = {
  id: string
  userId: string
  module: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export type MessageRow = {
  id: string
  conversationId: string
  role: string
  content: string
  createdAt: Date
}

export type SocialAccountRow = {
  id: string
  userId: string
  platform: string
  externalId: string
  displayName: string
  accessTokenEnc: string
  refreshTokenEnc: string | null
  expiresAt: Date | null
  metaJson: string
  lastSyncAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type MediaRow = {
  id: string
  userId: string
  kind: string
  source: string
  mime: string
  prompt: string | null
  name: string
  folderId: string | null
  size: number
  createdAt: Date
}

export type SocialPostRow = {
  id: string
  userId: string
  conversationId: string | null
  body: string
  mediaAssetId: string | null
  status: string
  source: string
  scheduledAt: Date | null
  duplicateWarning: string | null
  createdAt: Date
  updatedAt: Date
}

export type SocialTargetRow = {
  id: string
  postId: string
  accountId: string | null
  platform: string
  body: string
  title: string | null
  status: string
  externalId: string | null
  externalUrl: string | null
  error: string | null
  publishedAt: Date | null
}

export type SiteArticleRow = {
  id: string
  userId: string
  url: string
  title: string
  excerpt: string | null
  createdAt: Date
}

export type ArticleDraftRow = {
  id: string
  userId: string
  conversationId: string | null
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  markdown: string
  faqJson: string
  jsonLd: string
  keywordsJson: string
  internalLinksJson: string
  geoNotes: string
  createdAt: Date
  updatedAt: Date
}

export type SmtpRow = {
  id: string
  userId: string
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
  createdAt: Date
  updatedAt: Date
}

export type CampaignRow = {
  id: string
  userId: string
  conversationId: string | null
  name: string
  goal: string | null
  audience: string | null
  offer: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export type StepRow = {
  id: string
  campaignId: string
  position: number
  delayHours: number
  subject: string
  body: string
}

export type RecipientRow = {
  id: string
  campaignId: string
  email: string
  name: string | null
  status: string
  currentStep: number
}

export type OutreachMessageRow = {
  id: string
  campaignId: string
  recipientId: string
  stepId: string | null
  subject: string
  body: string
  status: string
  scheduledAt: Date | null
  sentAt: Date | null
  messageId: string | null
  error: string | null
  createdAt: Date
}

export type FolderRow = {
  id: string
  userId: string
  parentId: string | null
  name: string
  createdAt: Date
}

function text(value: unknown) {
  return typeof value === 'string' && value !== '' ? value : null
}

function date(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1971) return null
  return parsed
}

function requiredDate(value: unknown) {
  return date(value) || new Date(0)
}

function relation(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

function relations(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function jsonText(value: unknown, fallback: string) {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

export function mapBrand(record: PbRecord): BrandRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    websiteUrl: text(record.websiteUrl),
    companyName: text(record.companyName),
    logoMediaId: relation(record.logo),
    imageIdsJson: JSON.stringify(relations(record.images)),
    colorsJson: jsonText(record.colors, '[]'),
    fontsJson: jsonText(record.fonts, '[]'),
    whoTheyAre: text(record.whoTheyAre),
    whatTheyDo: text(record.whatTheyDo),
    audience: text(record.audience),
    toneOfVoice: text(record.toneOfVoice),
    articlesUrl: text(record.articlesUrl),
    onboardingCompleted: record.onboardingCompleted === true,
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapConversation(record: PbRecord): ConversationRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    module: String(record.module || ''),
    title: String(record.title || ''),
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapMessage(record: PbRecord): MessageRow {
  return {
    id: record.id,
    conversationId: String(record.conversation || ''),
    role: String(record.role || ''),
    content: String(record.content || ''),
    createdAt: requiredDate(record.created),
  }
}

export function mapAccount(record: PbRecord): SocialAccountRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    platform: String(record.platform || ''),
    externalId: String(record.externalId || ''),
    displayName: String(record.displayName || ''),
    accessTokenEnc: String(record.accessTokenEnc || ''),
    refreshTokenEnc: text(record.refreshTokenEnc),
    expiresAt: date(record.expiresAt),
    metaJson: jsonText(record.meta, '{}'),
    lastSyncAt: date(record.lastSyncAt),
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapMedia(record: PbRecord): MediaRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    kind: String(record.kind || ''),
    source: String(record.source || ''),
    mime: String(record.mime || 'application/octet-stream'),
    prompt: text(record.prompt),
    name: String(record.name || ''),
    folderId: relation(record.folder),
    size: numberOr(record.size, 0),
    createdAt: requiredDate(record.created),
  }
}

export function mapPost(record: PbRecord): SocialPostRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    conversationId: relation(record.conversation),
    body: String(record.body || ''),
    mediaAssetId: relation(record.media),
    status: String(record.status || ''),
    source: String(record.source || ''),
    scheduledAt: date(record.scheduledAt),
    duplicateWarning: text(record.duplicateWarning),
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapTarget(record: PbRecord): SocialTargetRow {
  return {
    id: record.id,
    postId: String(record.post || ''),
    accountId: relation(record.account),
    platform: String(record.platform || ''),
    body: String(record.body || ''),
    title: text(record.title),
    status: String(record.status || ''),
    externalId: text(record.externalId),
    externalUrl: text(record.externalUrl),
    error: text(record.error),
    publishedAt: date(record.publishedAt),
  }
}

export function mapArticle(record: PbRecord): SiteArticleRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    url: String(record.url || ''),
    title: String(record.title || ''),
    excerpt: text(record.excerpt),
    createdAt: requiredDate(record.created),
  }
}

export function mapDraft(record: PbRecord): ArticleDraftRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    conversationId: relation(record.conversation),
    title: String(record.title || ''),
    slug: String(record.slug || ''),
    metaTitle: String(record.metaTitle || ''),
    metaDescription: String(record.metaDescription || ''),
    markdown: String(record.markdown || ''),
    faqJson: jsonText(record.faq, '[]'),
    jsonLd: jsonText(record.jsonLd, '{}'),
    keywordsJson: jsonText(record.keywords, '[]'),
    internalLinksJson: jsonText(record.internalLinks, '[]'),
    geoNotes: String(record.geoNotes || ''),
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapSmtp(record: PbRecord): SmtpRow {
  const imapPort = numberOr(record.imapPort, 0)
  return {
    id: record.id,
    userId: String(record.user || ''),
    host: String(record.host || ''),
    port: numberOr(record.port, 0),
    secure: record.secure === true,
    username: String(record.username || ''),
    passwordEnc: String(record.passwordEnc || ''),
    fromEmail: String(record.fromEmail || ''),
    fromName: text(record.fromName),
    imapHost: text(record.imapHost),
    imapPort: imapPort > 0 ? imapPort : null,
    imapSecure: record.imapHost ? record.imapSecure === true : null,
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapCampaign(record: PbRecord): CampaignRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    conversationId: relation(record.conversation),
    name: String(record.name || ''),
    goal: text(record.goal),
    audience: text(record.audience),
    offer: text(record.offer),
    status: String(record.status || ''),
    createdAt: requiredDate(record.created),
    updatedAt: requiredDate(record.updated),
  }
}

export function mapStep(record: PbRecord): StepRow {
  return {
    id: record.id,
    campaignId: String(record.campaign || ''),
    position: numberOr(record.position, 0),
    delayHours: numberOr(record.delayHours, 0),
    subject: String(record.subject || ''),
    body: String(record.body || ''),
  }
}

export function mapRecipient(record: PbRecord): RecipientRow {
  return {
    id: record.id,
    campaignId: String(record.campaign || ''),
    email: String(record.email || ''),
    name: text(record.name),
    status: String(record.status || ''),
    currentStep: numberOr(record.currentStep, 0),
  }
}

export function mapOutreachMessage(record: PbRecord): OutreachMessageRow {
  return {
    id: record.id,
    campaignId: String(record.campaign || ''),
    recipientId: String(record.recipient || ''),
    stepId: relation(record.step),
    subject: String(record.subject || ''),
    body: String(record.body || ''),
    status: String(record.status || ''),
    scheduledAt: date(record.scheduledAt),
    sentAt: date(record.sentAt),
    messageId: text(record.messageId),
    error: text(record.error),
    createdAt: requiredDate(record.created),
  }
}

export function mapFolder(record: PbRecord): FolderRow {
  return {
    id: record.id,
    userId: String(record.user || ''),
    parentId: relation(record.parent),
    name: String(record.name || ''),
    createdAt: requiredDate(record.created),
  }
}

export function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : ''
}
