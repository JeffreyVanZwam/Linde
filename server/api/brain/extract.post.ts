import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { saveBrand } from '../../utils/brand'
import { extractBrand } from '../../utils/brain/extract'
import { parseInput } from '../../utils/http'

const schema = z.object({
  url: z.string().min(4),
  locale: z.enum(['nl', 'en']).default('nl'),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const extracted = await extractBrand(user.id, input.url, input.locale)
  return saveBrand(user.id, { ...extracted, onboardingCompleted: false })
})
