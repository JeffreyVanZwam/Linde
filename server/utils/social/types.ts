import type { SocialPlatform } from '~~/shared/platforms'

export type RemotePost = {
  externalId: string
  body: string
  title?: string | null
  url?: string | null
  publishedAt?: Date | null
}

export type PublishInput = {
  body: string
  title?: string | null
  image?: { path: string, mime: string } | null
  video?: { path: string, mime: string } | null
}

export type PublishResult = {
  externalId: string
  url?: string | null
}

export type ConnectedAccount = {
  platform: SocialPlatform
  externalId: string
  displayName: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  meta?: Record<string, string>
}

export type OAuthApp = {
  clientId: string
  clientSecret: string
  privacy: string
}

export type TokenSet = {
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
}
