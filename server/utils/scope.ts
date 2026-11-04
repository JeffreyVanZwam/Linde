import type { H3Event } from 'h3'
import { requireUser, type AuthUser } from './auth'
import { toBrandView, type BrandView } from './brand'
import { apiError } from './http'
import { ensureActiveBrand } from './store'

export async function requireBrand(event: H3Event): Promise<{ user: AuthUser, brand: BrandView }> {
  const user = await requireUser(event)
  const row = await ensureActiveBrand(user.id)
  if (!row) apiError(409, 'Maak eerst een merk')
  return { user, brand: toBrandView(row) }
}
