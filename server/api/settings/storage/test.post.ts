import { requireAdmin } from '../../../utils/auth'
import { apiError } from '../../../utils/http'
import { testStorage } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    await testStorage()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'S3-verbinding mislukte'
    apiError(400, message)
  }
  return { ok: true }
})
