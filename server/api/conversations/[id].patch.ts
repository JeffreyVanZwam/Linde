import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { findConversation, renameConversation } from '../../utils/store'

const schema = z.object({
  title: z.string().trim().min(1).max(300),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conversationId = parseInput(z.string().min(1), getRouterParam(event, 'id'))
  const input = parseInput(schema, await readBody(event))
  const conversation = await findConversation(conversationId, user.id)
  if (!conversation) apiError(404, 'Gesprek niet gevonden')
  await renameConversation(conversation.id, input.title)
  return { id: conversation.id, title: input.title }
})
