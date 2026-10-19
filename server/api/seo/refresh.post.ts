import { requireUser } from '../../utils/auth'
import { getBrand } from '../../utils/brand'
import { apiError } from '../../utils/http'
import { refreshArticles } from '../../utils/seo/crawl'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const brand = await getBrand(user.id)
  if (!brand?.articlesUrl) apiError(400, 'Stel eerst een artikelen-URL in')
  const count = await refreshArticles(user.id, brand.articlesUrl)
  return { count }
})
