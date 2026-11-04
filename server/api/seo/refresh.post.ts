import { requireBrand } from '../../utils/scope'
import { apiError } from '../../utils/http'
import { refreshArticles } from '../../utils/seo/crawl'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  if (!brand.articlesUrl) apiError(400, 'Stel eerst een artikelen-URL in')
  const count = await refreshArticles(user.id, brand.id, brand.articlesUrl)
  return { count }
})
