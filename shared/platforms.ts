export const chatModules = ['strategy', 'social', 'seo', 'outreach'] as const
export type ChatModule = (typeof chatModules)[number]

export const socialPlatforms = ['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'] as const
export type SocialPlatform = (typeof socialPlatforms)[number]

export const connectProviders = ['linkedin', 'meta', 'youtube', 'tiktok'] as const
export type ConnectProvider = (typeof connectProviders)[number]

export const postStatuses = ['draft', 'scheduled', 'publishing', 'published', 'failed'] as const
export type PostStatus = (typeof postStatuses)[number]

export const platformLimits: Record<SocialPlatform, { body: number; title?: number; requires: 'none' | 'image' | 'video' }> = {
  linkedin: { body: 3000, requires: 'none' },
  facebook: { body: 5000, requires: 'none' },
  instagram: { body: 2200, requires: 'image' },
  youtube: { body: 5000, title: 100, requires: 'video' },
  tiktok: { body: 2200, title: 150, requires: 'video' },
}

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (socialPlatforms as readonly string[]).includes(value)
}

export function isConnectProvider(value: string): value is ConnectProvider {
  return (connectProviders as readonly string[]).includes(value)
}
