import { requireAdmin } from '../../utils/auth'
import { listManagedUsers } from '../../utils/users'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return listManagedUsers()
})
