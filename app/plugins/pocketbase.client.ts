import PocketBase from 'pocketbase'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const pb = new PocketBase(config.public.pocketbaseUrl)
  pb.autoCancellation(false)
  const token = useCookie('pb_auth').value
  if (token) pb.authStore.save(token)
  return { provide: { pb } }
})
