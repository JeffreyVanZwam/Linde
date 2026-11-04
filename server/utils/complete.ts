import { generateText } from 'ai'
import { aiConfig, getLanguageModel, languageModelProblem } from './ai'

export async function completeText(system: string, prompt: string) {
  try {
    const { text } = await generateText({
      model: getLanguageModel(),
      system,
      prompt,
      maxRetries: aiConfig().tier === 'free' ? 0 : 1,
      abortSignal: AbortSignal.timeout(120_000),
    })
    return text.trim()
  }
  catch (error) {
    const known = languageModelProblem(error)
    throw createError({ statusCode: 502, statusMessage: known || (error instanceof Error ? error.message : 'Het model gaf geen antwoord') })
  }
}

export function parseJsonBlock<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1] || text
  const start = raw.indexOf('{')
  const arrayStart = raw.indexOf('[')
  const useArray = arrayStart >= 0 && (start < 0 || arrayStart < start)
  const open = useArray ? arrayStart : start
  const end = useArray ? raw.lastIndexOf(']') : raw.lastIndexOf('}')
  if (open < 0 || end < open) throw createError({ statusCode: 502, statusMessage: 'Het model gaf geen bruikbare JSON terug' })
  return JSON.parse(raw.slice(open, end + 1)) as T
}
