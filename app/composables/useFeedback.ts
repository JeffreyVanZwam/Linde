export function errorText(error: unknown) {
  if (error && typeof error === 'object') {
    const data = error as { statusMessage?: string, data?: { statusMessage?: string, message?: string } }
    return data.data?.statusMessage || data.data?.message || data.statusMessage || ''
  }
  return ''
}

export async function refreshMe() {
  const me = useState('me')
  const loaded = useState('me-loaded', () => false)
  me.value = await $fetch('/api/me')
  loaded.value = true
}
