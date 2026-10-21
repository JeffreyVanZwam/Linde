import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
})

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  websiteUrl: text('website_url'),
  companyName: text('company_name'),
  logoMediaId: text('logo_media_id'),
  imageIdsJson: text('image_ids_json').notNull().default('[]'),
  colorsJson: text('colors_json').notNull().default('[]'),
  fontsJson: text('fonts_json').notNull().default('[]'),
  whoTheyAre: text('who_they_are'),
  whatTheyDo: text('what_they_do'),
  audience: text('audience'),
  toneOfVoice: text('tone_of_voice'),
  articlesUrl: text('articles_url'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  module: text('module').notNull(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const socialProviderApps = sqliteTable('social_provider_apps', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  clientId: text('client_id').notNull(),
  clientSecretEnc: text('client_secret_enc').notNull(),
  privacy: text('privacy'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('social_provider_apps_user_provider').on(table.userId, table.provider),
])

export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  externalId: text('external_id').notNull(),
  displayName: text('display_name').notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  metaJson: text('meta_json').notNull().default('{}'),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('social_accounts_user_platform_external').on(table.userId, table.platform, table.externalId),
])

export const socialConnectPending = sqliteTable('social_connect_pending', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  payloadEnc: text('payload_enc').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  source: text('source').notNull(),
  path: text('path').notNull(),
  mime: text('mime').notNull(),
  prompt: text('prompt'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const socialPosts = sqliteTable('social_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id'),
  body: text('body').notNull().default(''),
  mediaAssetId: text('media_asset_id'),
  status: text('status').notNull(),
  source: text('source').notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
  duplicateWarning: text('duplicate_warning'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const socialPostTargets = sqliteTable('social_post_targets', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => socialAccounts.id, { onDelete: 'set null' }),
  platform: text('platform').notNull(),
  body: text('body').notNull().default(''),
  title: text('title'),
  status: text('status').notNull(),
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  error: text('error'),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
})

export const siteArticles = sqliteTable('site_articles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [
  uniqueIndex('site_articles_user_url').on(table.userId, table.url),
])

export const articleDrafts = sqliteTable('article_drafts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id'),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  metaTitle: text('meta_title').notNull(),
  metaDescription: text('meta_description').notNull(),
  markdown: text('markdown').notNull(),
  faqJson: text('faq_json').notNull().default('[]'),
  jsonLd: text('json_ld').notNull().default('{}'),
  keywordsJson: text('keywords_json').notNull().default('[]'),
  internalLinksJson: text('internal_links_json').notNull().default('[]'),
  geoNotes: text('geo_notes').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const smtpConnections = sqliteTable('smtp_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  secure: integer('secure', { mode: 'boolean' }).notNull(),
  username: text('username').notNull(),
  passwordEnc: text('password_enc').notNull(),
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name'),
  imapHost: text('imap_host'),
  imapPort: integer('imap_port'),
  imapSecure: integer('imap_secure', { mode: 'boolean' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const outreachCampaigns = sqliteTable('outreach_campaigns', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id'),
  name: text('name').notNull(),
  goal: text('goal'),
  audience: text('audience'),
  offer: text('offer'),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const outreachSteps = sqliteTable('outreach_steps', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => outreachCampaigns.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  delayHours: integer('delay_hours').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
})

export const outreachRecipients = sqliteTable('outreach_recipients', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => outreachCampaigns.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status').notNull(),
  currentStep: integer('current_step').notNull().default(0),
})

export const outreachMessages = sqliteTable('outreach_messages', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => outreachCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => outreachRecipients.id, { onDelete: 'cascade' }),
  stepId: text('step_id'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  messageId: text('message_id'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})
