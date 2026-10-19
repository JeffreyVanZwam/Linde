import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

const textProviders = ['openai', 'anthropic', 'gemini'] as const
type TextProvider = typeof textProviders[number]

function textProvider(value: string): TextProvider {
  return textProviders.includes(value as TextProvider) ? value as TextProvider : 'openai'
}

export function aiConfig() {
  const config = useRuntimeConfig()
  const provider = textProvider(config.aiProvider)
  const models = {
    openai: config.openaiModel,
    anthropic: config.anthropicModel,
    gemini: config.geminiModel,
  }
  return {
    provider,
    model: models[provider],
    imageProvider: config.imageProvider === 'none' ? 'none' as const : 'openai' as const,
    openaiApiKey: config.openaiApiKey,
    anthropicApiKey: config.anthropicApiKey,
    geminiApiKey: config.geminiApiKey,
    openaiImageModel: config.openaiImageModel,
  }
}

export function hasLanguageModel() {
  const config = aiConfig()
  const keys = {
    openai: config.openaiApiKey,
    anthropic: config.anthropicApiKey,
    gemini: config.geminiApiKey,
  }
  return Boolean(keys[config.provider])
}

export function getLanguageModel() {
  const config = aiConfig()
  if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw createError({ statusCode: 400, statusMessage: 'ANTHROPIC_API_KEY ontbreekt in .env' })
    }
    return createAnthropic({ apiKey: config.anthropicApiKey })(config.model)
  }
  if (config.provider === 'gemini') {
    if (!config.geminiApiKey) {
      throw createError({ statusCode: 400, statusMessage: 'GEMINI_API_KEY ontbreekt in .env' })
    }
    return createGoogle({ apiKey: config.geminiApiKey })(config.model)
  }
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 400, statusMessage: 'OPENAI_API_KEY ontbreekt in .env' })
  }
  return createOpenAI({ apiKey: config.openaiApiKey })(config.model)
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
