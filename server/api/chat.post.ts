import { requireUser } from '../utils/auth'
import { parseChat, streamChat } from '../utils/chat/run'
import { apiError } from '../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  try {
    const input = parseChat(await readBody(event))
    return streamChat(user.id, input)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    apiError(400, error instanceof Error ? error.message : 'Ongeldige chat')
  }
})
