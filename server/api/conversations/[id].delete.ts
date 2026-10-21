import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { deleteConversation, findConversation } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conversationId = parseInput(z.string().min(1), getRouterParam(event, 'id'))
  const conversation = await findConversation(conversationId, user.id)
  if (!conversation) apiError(404, 'Gesprek niet gevonden')
  await deleteConversation(conversation.id)
  return { ok: true }
})
