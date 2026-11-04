import { z } from 'zod'
import { requireBrand } from '../../../utils/scope'
import { apiError, parseInput } from '../../../utils/http'
import { findFolder, listFolders, updateFolder } from '../../../utils/store'

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { user, brand } = await requireBrand(event)
  const folderId = getRouterParam(event, 'id')
  if (!folderId) apiError(400, 'Map ontbreekt')
  const folder = await findFolder(folderId, user.id, brand.id)
  if (!folder) apiError(404, 'Map niet gevonden')
  const input = parseInput(schema, await readBody(event))
  if (input.parentId) {
    if (input.parentId === folder.id) apiError(400, 'Een map kan niet in zichzelf staan')
    const parent = await findFolder(input.parentId, user.id, brand.id)
    if (!parent) apiError(404, 'Map niet gevonden')
    if (await isInside(user.id, brand.id, folder.id, input.parentId)) apiError(400, 'Een map kan niet in een submap van zichzelf staan')
  }
  await updateFolder(folder.id, { name: input.name, parentId: input.parentId })
  return { ok: true }
})

async function isInside(userId: string, brandId: string, ancestorId: string, startId: string) {
  const folders = await listFolders(userId, brandId)
  let current: string | null = startId
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true
    seen.add(current)
    current = folders.find(folder => folder.id === current)?.parentId || null
  }
  return false
}
