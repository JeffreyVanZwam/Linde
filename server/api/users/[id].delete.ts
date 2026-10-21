import { requireAdmin } from '../../utils/auth'
import { deleteManagedUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Gebruiker ontbreekt' })
  await deleteManagedUser(userId, actor.id)
  return { ok: true }
})
