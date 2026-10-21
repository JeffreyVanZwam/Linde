import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'
import { parseInput } from '../../utils/http'
import { saveStorage, storageView } from '../../utils/storage'

const schema = z.object({
  mode: z.enum(['local', 's3']),
  bucket: z.string().max(300).optional(),
  region: z.string().max(100).optional(),
  endpoint: z.string().max(500).optional(),
  accessKey: z.string().max(300).optional(),
  secret: z.string().max(500).optional(),
  forcePathStyle: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = parseInput(schema, await readBody(event))
  await saveStorage(input)
  return storageView()
})
