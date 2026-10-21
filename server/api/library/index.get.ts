import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { findFolder, listFilesIn, listFolders } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = parseInput(z.object({ folder: z.string().optional() }), getQuery(event))
  const folderId = query.folder || null
  if (folderId && !await findFolder(folderId, user.id)) apiError(404, 'Map niet gevonden')
  const folders = (await listFolders(user.id)).filter(folder => folder.parentId === folderId)
  const files = await listFilesIn(user.id, folderId)
  return {
    folderId,
    breadcrumb: await breadcrumb(user.id, folderId),
    folders: folders.map(folder => ({ id: folder.id, name: folder.name })),
    files: files.map(file => ({
      id: file.id,
      name: file.name,
      mime: file.mime,
      kind: file.kind,
      source: file.source,
      size: file.size,
      image: file.kind === 'image',
    })),
    allFolders: (await listFolders(user.id)).map(folder => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
    })),
  }
})

async function breadcrumb(userId: string, folderId: string | null) {
  const trail: Array<{ id: string, name: string }> = []
  let current = folderId
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const folder = await findFolder(current, userId)
    if (!folder) break
    trail.unshift({ id: folder.id, name: folder.name })
    current = folder.parentId
  }
  return trail
}
