import { requireBrand } from '../../utils/scope'
import { apiError } from '../../utils/http'
import { findConversation, listMessages } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) apiError(400, 'Gesprek ontbreekt')
  const conversation = await findConversation(conversationId, user.id, brand.id)
  if (!conversation) apiError(404, 'Gesprek niet gevonden')
  return { conversation, messages: await listMessages(conversation.id) }
})
