import { requireBrand } from '../../../../utils/scope'
import { repurposeDraft } from '../../../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const id = getRouterParam(event, 'id') || ''
  return repurposeDraft({ userId: user.id, brand }, id)
})
