import { requireBrand } from '../../utils/scope'
import { listSiteArticles } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listSiteArticles(user.id, brand.id)
})
