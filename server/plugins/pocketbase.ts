import { useAdminPb } from '../utils/pb'

export default defineNitroPlugin(async () => {
  try {
    await useAdminPb()
  }
  catch (error) {
    console.error('PocketBase is niet bereikbaar. Start de app met pnpm dev, zodat de database meekomt.')
    throw error
  }
})