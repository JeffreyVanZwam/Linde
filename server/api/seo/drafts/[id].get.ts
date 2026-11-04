import { requireBrand } from '../../../utils/scope'
import { apiError, parseJson } from '../../../utils/http'
import { findDraft } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const draftId = getRouterParam(event, 'id')
  if (!draftId) apiError(400, 'Concept ontbreekt')
  const draft = await findDraft(draftId, user.id, brand.id)
  if (!draft) apiError(404, 'Concept niet gevonden')
  return {
    ...draft,
    faq: parseJson(draft.faqJson, []),
    jsonLd: parseJson(draft.jsonLd, {}),
    keywords: parseJson(draft.keywordsJson, []),
    internalLinks: parseJson(draft.internalLinksJson, []),
  }
})
