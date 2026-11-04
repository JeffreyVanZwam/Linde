import { z } from 'zod'
import { requireBrand } from '../../utils/scope'
import { apiError, parseInput } from '../../utils/http'
import { saveWritingRules } from '../../utils/store'
import type { WritingRule } from '../../utils/rows'

const schema = z.object({
  text: z.string().trim().min(2).max(240).optional(),
  id: z.string().optional(),
  enabled: z.boolean().optional(),
  remove: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const { brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  let rules: WritingRule[] = brand.writingRules
  if (input.remove && input.id) {
    rules = rules.filter(rule => rule.id !== input.id)
  }
  else if (input.id && input.enabled !== undefined) {
    rules = rules.map(rule => rule.id === input.id ? { ...rule, enabled: input.enabled! } : rule)
  }
  else if (input.text) {
    const key = input.text.toLowerCase()
    const existing = rules.find(rule => rule.text.toLowerCase() === key)
    rules = existing
      ? rules.map(rule => rule.id === existing.id ? { ...rule, enabled: true, useCount: rule.useCount + 1 } : rule)
      : [...rules, { id: crypto.randomUUID(), text: input.text, enabled: true, useCount: 1 }].slice(-20)
  }
  else apiError(400, 'Regel ontbreekt')
  await saveWritingRules(brand.id, rules)
  return { rules }
})
