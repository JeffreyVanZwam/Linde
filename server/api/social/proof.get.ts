import { requireBrand } from '../../utils/scope'
import { listTestimonials } from '../../utils/workshop'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  return listTestimonials(user.id, brand.id)
})
