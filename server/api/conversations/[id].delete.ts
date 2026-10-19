import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db/client'
import { conversations, messages } from '../../db/schema'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conversationId = parseInput(z.string().min(1), getRouterParam(event, 'id'))
  const db = useDb()
  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)),
  })
  if (!conversation) apiError(404, 'Gesprek niet gevonden')
  await db.delete(messages).where(eq(messages.conversationId, conversation.id))
  await db.delete(conversations).where(and(eq(conversations.id, conversation.id), eq(conversations.userId, user.id)))
  return { ok: true }
})
