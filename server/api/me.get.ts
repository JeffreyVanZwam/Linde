import { requireUser } from '../utils/auth'
import { toBrandView } from '../utils/brand'
import { ensureActiveBrand, listBrandRows } from '../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const active = await ensureActiveBrand(user.id)
  const brands = (await listBrandRows(user.id)).map(row => ({
    id: row.id,
    companyName: row.companyName,
    color: row.color,
    archived: row.archived,
    onboardingCompleted: row.onboardingCompleted,
    position: row.position,
  }))
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    brand: active ? toBrandView(active) : null,
    brands,
  }
})
