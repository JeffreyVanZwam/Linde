import PocketBase from 'pocketbase'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const base = window.location.protocol === 'https:'
    ? `${window.location.origin}/pb`
    : config.public.pocketbaseUrl
  const pb = new PocketBase(base)
  pb.autoCancellation(false)
  const token = useCookie('pb_auth').value
  if (token) pb.authStore.save(token)
  return { provide: { pb } }
})
