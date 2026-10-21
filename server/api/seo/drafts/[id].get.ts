import { requireUser } from '../../../utils/auth'
import { apiError, parseJson } from '../../../utils/http'
import { findDraft } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const draftId = getRouterParam(event, 'id')
  if (!draftId) apiError(400, 'Concept ontbreekt')
  const draft = await findDraft(draftId, user.id)
  if (!draft) apiError(404, 'Concept niet gevonden')
  return {
    ...draft,
    faq: parseJson(draft.faqJson, []),
    jsonLd: parseJson(draft.jsonLd, {}),
    keywords: parseJson(draft.keywordsJson, []),
    internalLinks: parseJson(draft.internalLinksJson, []),
  }
})
