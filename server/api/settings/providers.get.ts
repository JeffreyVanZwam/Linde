import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const config = useRuntimeConfig()
  return {
    aiProvider: config.public.aiProvider,
    imageProvider: config.public.imageProvider,
    openaiModel: config.openaiModel,
    anthropicModel: config.anthropicModel,
    textReady: config.aiProvider === 'anthropic' ? Boolean(config.anthropicApiKey) : Boolean(config.openaiApiKey),
    imageReady: config.imageProvider !== 'none' && Boolean(config.openaiApiKey),
    mailApi: Boolean(config.mailApiUrl && config.mailApiKey),
    social: {
      linkedin: Boolean(config.linkedinClientId && config.linkedinClientSecret),
      meta: Boolean(config.metaAppId && config.metaAppSecret),
      youtube: Boolean(config.googleClientId && config.googleClientSecret),
      tiktok: Boolean(config.tiktokClientKey && config.tiktokClientSecret),
    },
  }
})
