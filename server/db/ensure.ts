import { useSql } from './client'

const statements = [
  `CREATE TABLE IF NOT EXISTS user (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    email_verified integer NOT NULL DEFAULT 0,
    image text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id text PRIMARY KEY,
    expires_at integer NOT NULL,
    token text NOT NULL UNIQUE,
    created_at integer NOT NULL,
    updated_at integer NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS account (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at integer,
    refresh_token_expires_at integer,
    scope text,
    password text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS verification (
    id text PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at integer NOT NULL,
    created_at integer,
    updated_at integer
  )`,
  `CREATE TABLE IF NOT EXISTS brands (
    id text PRIMARY KEY,
    user_id text NOT NULL UNIQUE,
    website_url text,
    company_name text,
    logo_media_id text,
    image_ids_json text NOT NULL DEFAULT '[]',
    colors_json text NOT NULL DEFAULT '[]',
    fonts_json text NOT NULL DEFAULT '[]',
    who_they_are text,
    what_they_do text,
    audience text,
    tone_of_voice text,
    articles_url text,
    onboarding_completed integer NOT NULL DEFAULT 0,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    module text NOT NULL,
    title text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    conversation_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS social_accounts (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    platform text NOT NULL,
    external_id text NOT NULL,
    display_name text NOT NULL,
    access_token_enc text NOT NULL,
    refresh_token_enc text,
    expires_at integer,
    meta_json text NOT NULL DEFAULT '{}',
    last_sync_at integer,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_external ON social_accounts (user_id, platform, external_id)`,
  `CREATE TABLE IF NOT EXISTS social_connect_pending (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    provider text NOT NULL,
    payload_enc text NOT NULL,
    expires_at integer NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    kind text NOT NULL,
    source text NOT NULL,
    path text NOT NULL,
    mime text NOT NULL,
    prompt text,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS social_posts (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    conversation_id text,
    body text NOT NULL DEFAULT '',
    media_asset_id text,
    status text NOT NULL,
    source text NOT NULL,
    scheduled_at integer,
    duplicate_warning text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS social_post_targets (
    id text PRIMARY KEY,
    post_id text NOT NULL,
    account_id text,
    platform text NOT NULL,
    body text NOT NULL DEFAULT '',
    title text,
    status text NOT NULL,
    external_id text,
    external_url text,
    error text,
    published_at integer
  )`,
  `CREATE TABLE IF NOT EXISTS site_articles (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    excerpt text,
    created_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS site_articles_user_url ON site_articles (user_id, url)`,
  `CREATE TABLE IF NOT EXISTS article_drafts (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    conversation_id text,
    title text NOT NULL,
    slug text NOT NULL,
    meta_title text NOT NULL,
    meta_description text NOT NULL,
    markdown text NOT NULL,
    faq_json text NOT NULL DEFAULT '[]',
    json_ld text NOT NULL DEFAULT '{}',
    keywords_json text NOT NULL DEFAULT '[]',
    internal_links_json text NOT NULL DEFAULT '[]',
    geo_notes text NOT NULL DEFAULT '',
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS social_provider_apps (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    provider text NOT NULL,
    client_id text NOT NULL,
    client_secret_enc text NOT NULL,
    privacy text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS social_provider_apps_user_provider ON social_provider_apps (user_id, provider)`,
  `CREATE TABLE IF NOT EXISTS smtp_connections (
    id text PRIMARY KEY,
    user_id text NOT NULL UNIQUE,
    host text NOT NULL,
    port integer NOT NULL,
    secure integer NOT NULL,
    username text NOT NULL,
    password_enc text NOT NULL,
    from_email text NOT NULL,
    from_name text,
    imap_host text,
    imap_port integer,
    imap_secure integer,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    conversation_id text,
    name text NOT NULL,
    goal text,
    audience text,
    offer text,
    status text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_steps (
    id text PRIMARY KEY,
    campaign_id text NOT NULL,
    position integer NOT NULL,
    delay_hours integer NOT NULL,
    subject text NOT NULL,
    body text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_recipients (
    id text PRIMARY KEY,
    campaign_id text NOT NULL,
    email text NOT NULL,
    name text,
    status text NOT NULL,
    current_step integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_messages (
    id text PRIMARY KEY,
    campaign_id text NOT NULL,
    recipient_id text NOT NULL,
    step_id text,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL,
    scheduled_at integer,
    sent_at integer,
    message_id text,
    error text,
    created_at integer NOT NULL
  )`,
]

let ready: Promise<void> | undefined

export function ensureDatabase() {
  if (!ready) {
    ready = (async () => {
      const sql = useSql()
      for (const statement of statements) {
        await sql.execute(statement)
      }
    })()
  }
  return ready
}
