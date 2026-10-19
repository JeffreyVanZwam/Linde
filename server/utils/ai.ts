import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export function aiConfig() {
  const config = useRuntimeConfig()
  return {
    provider: config.aiProvider === 'anthropic' ? 'anthropic' as const : 'openai' as const,
    imageProvider: config.imageProvider === 'none' ? 'none' as const : 'openai' as const,
    openaiApiKey: config.openaiApiKey,
    anthropicApiKey: config.anthropicApiKey,
    openaiModel: config.openaiModel,
    anthropicModel: config.anthropicModel,
    openaiImageModel: config.openaiImageModel,
  }
}

export function hasLanguageModel() {
  const config = aiConfig()
  return config.provider === 'anthropic' ? Boolean(config.anthropicApiKey) : Boolean(config.openaiApiKey)
}

export function getLanguageModel() {
  const config = aiConfig()
  if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw createError({ statusCode: 400, statusMessage: 'ANTHROPIC_API_KEY ontbreekt in .env' })
    }
    return createAnthropic({ apiKey: config.anthropicApiKey })(config.anthropicModel)
  }
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 400, statusMessage: 'OPENAI_API_KEY ontbreekt in .env' })
  }
  return createOpenAI({ apiKey: config.openaiApiKey })(config.openaiModel)
}

export function getImageModel() {
  const config = aiConfig()
  if (config.imageProvider === 'none') {
    throw createError({ statusCode: 400, statusMessage: 'Afbeeldingsgeneratie staat uit (IMAGE_PROVIDER=none)' })
  }
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 400, statusMessage: 'OPENAI_API_KEY ontbreekt voor afbeeldingen' })
  }
  return createOpenAI({ apiKey: config.openaiApiKey }).image(config.openaiImageModel)
}
