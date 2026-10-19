import { requireUser } from '../../utils/auth'
import { aiConfig, hasLanguageModel } from '../../utils/ai'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const config = useRuntimeConfig()
  const ai = aiConfig()
  return {
    aiProvider: ai.provider,
    tier: ai.tier,
    model: ai.model,
    imageProvider: config.public.imageProvider,
    textReady: hasLanguageModel(),
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
