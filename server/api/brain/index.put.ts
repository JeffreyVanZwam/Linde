import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { saveBrand } from '../../utils/brand'
import { parseInput } from '../../utils/http'

const schema = z.object({
  websiteUrl: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  logoMediaId: z.string().nullable().optional(),
  imageIds: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  fonts: z.array(z.string()).optional(),
  whoTheyAre: z.string().nullable().optional(),
  whatTheyDo: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  toneOfVoice: z.string().nullable().optional(),
  articlesUrl: z.string().nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  return saveBrand(user.id, input)
})
