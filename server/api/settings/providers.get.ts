import { requireUser } from '../../utils/auth'
import { aiConfig, hasLanguageModel } from '../../utils/ai'
import { socialReady } from '../../utils/social/apps'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
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
    social: await socialReady(user.id),
  }
})
