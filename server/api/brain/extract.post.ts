import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getBrand, saveBrand } from '../../utils/brand'
import { extractBrand } from '../../utils/brain/extract'
import { parseInput } from '../../utils/http'

const schema = z.object({
  url: z.string().min(4),
  locale: z.enum(['nl', 'en']).default('nl'),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const current = await getBrand(user.id) || await saveBrand(user.id, { companyName: '', onboardingCompleted: false })
  if (!current) return saveBrand(user.id, { companyName: '', onboardingCompleted: false })
  const extracted = await extractBrand(user.id, current.id, input.url, input.locale)
  return saveBrand(user.id, extracted)
})
