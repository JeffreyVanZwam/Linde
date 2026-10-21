import { getBrand } from '../utils/brand'
import { requireUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const brand = await getBrand(user.id)
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    brand,
  }
})
