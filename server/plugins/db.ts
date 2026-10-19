import { ensureDatabase } from '../db/ensure'

export default defineNitroPlugin(async () => {
  await ensureDatabase()
})
