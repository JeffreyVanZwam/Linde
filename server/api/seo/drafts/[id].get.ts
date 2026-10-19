import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { articleDrafts } from '../../../db/schema'
import { requireUser } from '../../../utils/auth'
import { apiError, parseJson } from '../../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const draftId = getRouterParam(event, 'id')
  if (!draftId) apiError(400, 'Concept ontbreekt')
  const draft = await useDb().query.articleDrafts.findFirst({
    where: and(eq(articleDrafts.id, draftId), eq(articleDrafts.userId, user.id)),
  })
  if (!draft) apiError(404, 'Concept niet gevonden')
  return {
    ...draft,
    faq: parseJson(draft.faqJson, []),
    jsonLd: parseJson(draft.jsonLd, {}),
    keywords: parseJson(draft.keywordsJson, []),
    internalLinks: parseJson(draft.internalLinksJson, []),
  }
})
