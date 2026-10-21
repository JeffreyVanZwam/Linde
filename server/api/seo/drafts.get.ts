import { requireUser } from '../../utils/auth'
import { listDrafts } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listDrafts(user.id)
})
