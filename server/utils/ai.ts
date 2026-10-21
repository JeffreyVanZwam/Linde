import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

const textProviders = ['free', 'openai', 'anthropic', 'gemini'] as const
type TextProvider = typeof textProviders[number]

function textProvider(value: string): TextProvider {
  return textProviders.includes(value as TextProvider) ? value as TextProvider : 'free'
}

export function aiConfig() {
  const config = useRuntimeConfig()
  const provider = textProvider(config.aiProvider)
  const models = {
    free: config.freeModel,
    openai: config.openaiModel,
    anthropic: config.anthropicModel,
    gemini: config.geminiModel,
  }
  return {
    provider,
    model: models[provider],
    tier: provider === 'free' ? 'free' as const : 'paid' as const,
    imageProvider: config.imageProvider === 'none' ? 'none' as const : 'openai' as const,
    freeBaseUrl: config.freeBaseUrl,
    freeApiKey: config.freeApiKey,
    openaiApiKey: config.openaiApiKey,
    anthropicApiKey: config.anthropicApiKey,
    geminiApiKey: config.geminiApiKey,
    openaiImageModel: config.openaiImageModel,
  }
}

export function hasLanguageModel() {
  const config = aiConfig()
  if (config.provider === 'free') return true
  const keys = {
    openai: config.openaiApiKey,
    anthropic: config.anthropicApiKey,
    gemini: config.geminiApiKey,
  }
  return Boolean(keys[config.provider])
}

async function freeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const first = input instanceof Request ? input.clone() : input
  const response = await fetch(first, init)
  if (response.status !== 402 && response.status !== 429) return response
  const wait = Number(response.headers.get('retry-after'))
  if (!Number.isFinite(wait) || wait <= 0 || wait > 40) return response
  await response.body?.cancel()
  await new Promise(resolve => setTimeout(resolve, wait * 1000))
  const second = input instanceof Request ? input.clone() : input
  return fetch(second, init)
}

export function getLanguageModel() {
  const config = aiConfig()
  if (config.provider === 'free') {
    return createOpenAI({
      baseURL: config.freeBaseUrl,
      apiKey: config.freeApiKey || 'unused',
      name: 'free',
      fetch: freeFetch,
    }).chat(config.model)
  }
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
