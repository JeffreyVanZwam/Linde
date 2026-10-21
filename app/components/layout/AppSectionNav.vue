<script setup lang="ts">
import { motion } from 'motion-v'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const open = useState('nav-open', () => false)

const path = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/')

const items = computed(() => {
  const current = path.value
  if (current.startsWith('/social')) {
    return [
      { to: '/social', label: t('nav.overview'), on: (value: string) => value === '/social' || value.startsWith('/social/chat') },
      { to: '/social/accounts', label: t('social.accounts'), on: (value: string) => value.startsWith('/social/accounts') },
      { to: '/social/calendar', label: t('social.calendar'), on: (value: string) => value.startsWith('/social/calendar') },
      { to: '/social/compose', label: t('social.compose'), on: (value: string) => value.startsWith('/social/compose') },
    ]
  }
  if (current.startsWith('/seo')) {
    return [
      { to: '/seo', label: t('nav.overview'), on: (value: string) => value === '/seo' || value.startsWith('/seo/chat') || value.startsWith('/seo/articles') },
      { to: '/seo/settings', label: t('seo.settings'), on: (value: string) => value.startsWith('/seo/settings') },
    ]
  }
  if (current.startsWith('/outreach')) {
    return [
      { to: '/outreach', label: t('nav.overview'), on: (value: string) => value.startsWith('/outreach') && !value.startsWith('/outreach/settings') },
      { to: '/outreach/settings', label: t('outreach.settings'), on: (value: string) => value.startsWith('/outreach/settings') },
    ]
  }
  return []
})
</script>

<template>
  <nav v-if="items.length" class="no-scrollbar flex min-w-0 gap-2 overflow-x-auto" :aria-label="t('nav.menu')">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="localePath(item.to)"
      class="relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition duration-200"
      :class="item.on(path) ? 'text-cta-ink' : 'bg-soft text-muted hover:text-ink'"
      @click="open = false"
    >
      <motion.span
        v-if="item.on(path)"
        layout-id="section-pill"
        class="absolute inset-0 rounded-full bg-cta"
        :transition="{ type: 'spring', bounce: 0.18, duration: 0.45 }"
      />
      <span class="relative z-10">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
