import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { conversations, messages } from '../../db/schema'
import { requireUser } from '../../utils/auth'
import { apiError } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) apiError(400, 'Gesprek ontbreekt')
  const conversation = await useDb().query.conversations.findFirst({
    where: and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)),
  })
  if (!conversation) apiError(404, 'Gesprek niet gevonden')
  const items = await useDb().query.messages.findMany({
    where: eq(messages.conversationId, conversation.id),
    orderBy: messages.createdAt,
  })
  return { conversation, messages: items }
})
