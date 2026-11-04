import { z } from 'zod'
import { apiError, parseInput } from '../../../utils/http'
import { requireBrand } from '../../../utils/scope'
import { deletePosts, deleteTargetsForPost, findPost, setOpenTargetsStatus, updatePost } from '../../../utils/store'

const schema = z.object({
  ids: z.array(z.string()).min(1).max(40),
  action: z.enum(['delete', 'schedule', 'draft']),
  scheduledAt: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const input = parseInput(schema, await readBody(event))
  const when = input.scheduledAt ? new Date(input.scheduledAt) : null
  if (input.action === 'schedule' && (!when || Number.isNaN(when.getTime()))) apiError(400, 'Kies een datum')
  const owned: string[] = []
  for (const id of input.ids) {
    const post = await findPost(id, user.id, brand.id)
    if (post && post.source === 'local') owned.push(post.id)
  }
  if (!owned.length) apiError(404, 'Geen posts gevonden')
  if (input.action === 'delete') {
    for (const id of owned) await deleteTargetsForPost(id)
    await deletePosts(owned)
  }
  else {
    for (const id of owned) {
      await updatePost(id, input.action === 'schedule'
        ? { status: 'scheduled', scheduledAt: when }
        : { status: 'draft' })
      await setOpenTargetsStatus(id, input.action === 'schedule' ? 'scheduled' : 'draft')
    }
  }
  return { count: owned.length }
})
