import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { APICallError } from 'ai'

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

export function languageModelProblem(error: unknown) {
  if (!APICallError.isInstance(error)) return null
  const provider = aiConfig().provider
  const name = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Het gratis model'
  if (error.statusCode === 402) {
    if (provider === 'free' && !aiConfig().freeApiKey) {
      return 'Het gratis model laat één antwoord per 45 seconden toe. Wacht even en probeer opnieuw.'
    }
    return `${name} heeft geen tegoed meer. Vul het tegoed aan of kies een ander model in .env.`
  }
  if (error.statusCode === 429) return `${name} heeft het verzoeklimiet bereikt. Wacht even of kies een ander model in .env.`
  if (error.statusCode === 401 || error.statusCode === 403) return `De sleutel voor ${name} is geweigerd. Controleer .env.`
  return null
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

const freeGapMs = 46_000
let freeTail = Promise.resolve()
let freeNextAt = 0

function enqueueFree<T>(job: () => Promise<T>) {
  const run = freeTail.then(job, job)
  freeTail = run.then(() => undefined, () => undefined)
  return run
}

async function freeRequest(input: RequestInfo | URL, init?: RequestInit) {
  const source = new Request(input, init)
  if (aiConfig().freeApiKey) return source
  const headers = new Headers(source.headers)
  headers.delete('authorization')
  const bodyless = source.method === 'GET' || source.method === 'HEAD'
  return new Request(source.url, {
    method: source.method,
    headers,
    body: bodyless ? null : source.body,
    duplex: 'half',
  } as RequestInit)
}

async function fetchFreeOnce(request: Request) {
  const copies = [request, request.clone(), request.clone()]
  let response = await fetch(copies[0])
  for (let attempt = 0; attempt < 2 && (response.status === 402 || response.status === 429); attempt++) {
    const wait = Number(response.headers.get('retry-after'))
    if (!Number.isFinite(wait) || wait <= 0 || wait > 60) return response
    await response.body?.cancel()
    await new Promise(resolve => setTimeout(resolve, wait * 1000))
    freeNextAt = Date.now() + freeGapMs
    response = await fetch(copies[attempt + 1])
  }
  return response
}

async function freeFetch(input: RequestInfo | URL, init?: RequestInit) {
  return enqueueFree(async () => {
    const delay = freeNextAt - Date.now()
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
    freeNextAt = Date.now() + freeGapMs
    return fetchFreeOnce(await freeRequest(input, init))
  })
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
