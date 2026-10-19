type Me = {
  user: { id: string, name: string, email: string }
  brand: { onboardingCompleted: boolean } | null
}

export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const bare = to.path.replace(/^\/en(?=\/|$)/, '') || '/'
  const publicRoutes = new Set(['/login', '/register', '/unsubscribe'])
  const meState = useState<Me | null>('me', () => null)
  const loaded = useState('me-loaded', () => false)

  if (import.meta.server || !loaded.value) {
    try {
      meState.value = await useRequestFetch()<Me>('/api/me')
    }
    catch {
      meState.value = null
    }
    loaded.value = true
  }

  const me = meState.value
  if (!me && !publicRoutes.has(bare)) return navigateTo(localePath('/login'))
  if (me && (bare === '/login' || bare === '/register')) {
    return navigateTo(localePath(me.brand?.onboardingCompleted ? '/' : '/onboarding'))
  }
  if (me && !me.brand?.onboardingCompleted && bare !== '/onboarding' && !publicRoutes.has(bare)) {
    return navigateTo(localePath('/onboarding'))
  }
})
