import { z } from 'zod'
import { apiError, parseInput } from '../../../utils/http'
import { requireBrand } from '../../../utils/scope'
import { findDraft, updateDraft } from '../../../utils/store'

const schema = z.object({
  title: z.string().min(1).max(500).optional(),
  markdown: z.string().min(1).max(200000).optional(),
  metaTitle: z.string().max(500).optional(),
  metaDescription: z.string().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  const draft = await findDraft(id, user.id, brand.id)
  if (!draft) apiError(404, 'Concept niet gevonden')
  const input = parseInput(schema, await readBody(event))
  await updateDraft(draft.id, input)
  return { ok: true }
})
