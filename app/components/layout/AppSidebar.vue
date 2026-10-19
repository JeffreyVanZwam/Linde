<script setup lang="ts">
import { motion } from 'motion-v'

const { t } = useI18n()
const localePath = useLocalePath()
const open = useState('nav-open', () => false)
const route = useRoute()

const items = computed(() => [
  { to: '/', label: t('nav.home'), icon: 'solar:home-2-bold-duotone' },
  { to: '/brain', label: t('nav.brain'), icon: 'solar:brain-bold-duotone' },
  { to: '/strategy', label: t('nav.strategy'), icon: 'solar:chat-round-dots-bold-duotone' },
  { to: '/social', label: t('nav.social'), icon: 'solar:share-circle-bold-duotone' },
  { to: '/seo', label: t('nav.seo'), icon: 'solar:document-text-bold-duotone' },
  { to: '/outreach', label: t('nav.outreach'), icon: 'solar:letter-bold-duotone' },
  { to: '/settings', label: t('nav.settings'), icon: 'solar:settings-bold-duotone' },
])

function active(path: string) {
  const bare = route.path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (path === '/') return bare === '/'
  return bare === path || bare.startsWith(`${path}/`)
}

async function logout() {
  await authClient.signOut()
  useState('me').value = null
  useState('me-loaded').value = false
  await navigateTo(localePath('/login'))
}
</script>

<template>
  <button class="nav-surface fixed left-3 top-3 z-40 flex size-11 items-center justify-center rounded-full bg-accent text-white lg:hidden" type="button" :aria-label="t('nav.menu')" @click="open = !open">
    <Icon name="solar:hamburger-menu-linear" class="size-5" />
  </button>
  <div v-if="open" class="fixed inset-0 z-30 bg-ink/40 lg:hidden" @click="open = false" />
  <motion.aside
    class="nav-surface fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-3rem))] flex-col bg-accent px-4 py-5 text-white sm:px-5 sm:py-6"
    :class="open ? 'flex' : 'hidden lg:flex'"
    :initial="{ x: -12, opacity: 0 }"
    :animate="{ x: 0, opacity: 1 }"
  >
    <NuxtLink :to="localePath('/')" class="flex items-center gap-3" @click="open = false">
      <AppMark inverted class="size-9 text-accent" />
      <span class="font-serif text-2xl">{{ t('app.name') }}</span>
    </NuxtLink>
    <nav class="mt-8 flex flex-1 flex-col gap-1 sm:mt-10">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="localePath(item.to)"
        class="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
        :class="active(item.to) ? 'bg-white text-ink' : 'hover:bg-white/10'"
        @click="open = false"
      >
        <Icon :name="item.icon" class="size-5" />
        {{ item.label }}
      </NuxtLink>
    </nav>
    <AppInstallPrompt />
    <button type="button" class="mt-2 flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-white/10" @click="logout">
      <Icon name="solar:logout-2-bold-duotone" class="size-5" />
      {{ t('nav.logout') }}
    </button>
  </motion.aside>
</template>
