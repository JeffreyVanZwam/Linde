import { themeIds, themes, type ThemeId } from '~~/shared/themes'

export function useTheme() {
  const stored = useCookie<string>('linde-theme', {
    default: () => 'cyprus',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  })

  const id = computed<ThemeId>({
    get() {
      return themeIds.includes(stored.value as ThemeId) ? stored.value as ThemeId : 'cyprus'
    },
    set(value) {
      stored.value = value
    },
  })

  const current = computed(() => themes[id.value])

  function set(value: ThemeId) {
    id.value = value
  }

  return { id, current, set }
}
