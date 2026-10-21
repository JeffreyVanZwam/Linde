import { requireUser } from '../../utils/auth'
import { listSiteArticles } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listSiteArticles(user.id)
})
