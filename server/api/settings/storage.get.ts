import { requireUser } from '../../utils/auth'
import { storageView } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  return storageView()
})
