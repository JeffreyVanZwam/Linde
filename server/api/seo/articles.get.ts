import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { siteArticles } from '../../db/schema'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return useDb().query.siteArticles.findMany({ where: eq(siteArticles.userId, user.id) })
})
