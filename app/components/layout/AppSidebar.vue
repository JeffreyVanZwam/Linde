<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const open = useState('nav-open', () => false)
const route = useRoute()

const groups = computed(() => {
  const rows = [
    {
      label: t('nav.overview'),
      items: [
        { to: '/', label: t('nav.home'), icon: 'solar:home-2-bold-duotone' },
      ],
    },
    {
      label: t('nav.groupBrand'),
      items: [
        { to: '/brain', label: t('nav.brain'), icon: 'solar:brain-bold-duotone' },
        { to: '/files', label: t('nav.files'), icon: 'solar:folder-bold-duotone' },
      ],
    },
    {
      label: t('nav.groupCreate'),
      items: [
        { to: '/strategy', label: t('nav.strategy'), icon: 'solar:chat-round-dots-bold-duotone' },
        { to: '/social', label: t('nav.social'), icon: 'solar:share-circle-bold-duotone' },
        { to: '/seo', label: t('nav.seo'), icon: 'solar:document-text-bold-duotone' },
        { to: '/outreach', label: t('nav.outreach'), icon: 'solar:letter-bold-duotone' },
      ],
    },
  ]
  let delay = 40
  return rows.map(group => ({
    ...group,
    items: group.items.map((item) => {
      delay += 36
      return { ...item, delay }
    }),
  }))
})

function bare(path: string) {
  return path.replace(/^\/en(?=\/|$)/, '') || '/'
}

function active(path: string) {
  const current = bare(route.path)
  if (path === '/') return current === '/'
  return current === path || current.startsWith(`${path}/`)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
watch(() => route.fullPath, () => {
  open.value = false
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  useNuxtApp().$pb.authStore.clear()
  useCookie('pb_auth').value = null
  useState('me').value = null
  useState('me-loaded').value = false
  await navigateTo(localePath('/login'))
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden" @click="open = false" />
  <aside
    class="z-40 flex h-dvh w-[min(17rem,85vw)] shrink-0 flex-col overflow-hidden bg-sidebar px-4 py-5 text-sidebar-ink sm:w-64"
    :class="open
      ? 'fixed inset-y-0 left-0 shadow-2xl lg:static lg:shadow-none'
      : 'max-lg:hidden'"
  >
    <NuxtLink :to="localePath('/')" class="flex items-center gap-3 px-1" @click="open = false">
      <span class="flex size-11 items-center justify-center rounded-full ring-1 ring-white/30">
        <AppMark class="size-8 text-sidebar-ink" />
      </span>
      <span>
        <span class="block font-display text-lg font-semibold tracking-tight">{{ t('app.name') }}</span>
        <span class="block text-xs text-sidebar-muted">{{ t('nav.dashboard') }}</span>
      </span>
    </NuxtLink>
    <nav class="mt-8 flex shrink-0 flex-col gap-6">
      <div v-for="group in groups" :key="group.label">
        <p class="px-3 text-xs font-medium text-sidebar-muted">
          {{ group.label }}
        </p>
        <div class="mt-1.5 flex flex-col gap-0.5">
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="localePath(item.to)"
            class="nav-link flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition duration-200"
            :class="active(item.to) ? 'bg-sidebar-active text-sidebar-ink' : 'text-sidebar-muted hover:translate-x-0.5 hover:bg-white/10 hover:text-sidebar-ink'"
            :style="{ '--d': `${item.delay}ms` }"
            @click="open = false"
          >
            <Icon :name="item.icon" class="size-5 shrink-0" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </nav>
    <AppChatHistory />
    <div class="mt-4 shrink-0 space-y-1 border-t border-white/10 pt-3">
      <NuxtLink
        :to="localePath('/settings')"
        class="flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition"
        :class="active('/settings') ? 'bg-sidebar-active text-sidebar-ink' : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-ink'"
        @click="open = false"
      >
        <Icon name="solar:settings-bold-duotone" class="size-5" />
        {{ t('nav.settings') }}
      </NuxtLink>
      <AppInstallPrompt />
      <button type="button" class="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-ink" @click="logout">
        <Icon name="solar:logout-2-bold-duotone" class="size-5" />
        {{ t('nav.logout') }}
      </button>
    </div>
  </aside>
</template>
