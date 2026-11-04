import { requireBrand } from '../utils/scope'
import { parseChat, streamChat } from '../utils/chat/run'
import { apiError } from '../utils/http'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  try {
    const input = parseChat(await readBody(event))
    return streamChat(user.id, brand.id, input)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    apiError(400, error instanceof Error ? error.message : 'Ongeldige chat')
  }
})
