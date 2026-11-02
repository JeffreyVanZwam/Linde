<script setup lang="ts">
import { motion } from 'motion-v'
import { platformLabel } from '~~/shared/platforms'

export type ChannelAccount = {
  id: string
  platform: string
  displayName: string
  authorType: string | null
}

const props = defineProps<{
  open: boolean
  accounts: ChannelAccount[]
  hiddenIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  toggle: [id: string]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const reduceMotion = ref(false)

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

function hidden(id: string) {
  return props.hiddenIds.includes(id)
}

function nameOf(account: ChannelAccount) {
  return account.displayName || platformLabel(account.platform)
}

function meta(account: ChannelAccount) {
  const name = platformLabel(account.platform)
  if (account.platform === 'instagram') return name
  if (account.authorType === 'organization') return `${name} · ${t('social.linkedinPage')}`
  if (account.authorType === 'person') return `${name} · ${t('social.linkedinProfile')}`
  return name
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col overflow-hidden border-line bg-surface transition-[width,height] duration-300 ease-out"
    :class="open
      ? 'h-[22rem] w-full border-b lg:h-auto lg:w-72 lg:border-r lg:border-b-0'
      : 'h-14 w-full border-b lg:h-auto lg:w-14 lg:border-r lg:border-b-0'"
  >
    <div class="flex items-center gap-2 px-3 py-3" :class="open ? 'justify-between' : 'justify-between lg:justify-center'">
      <h2 v-if="open" class="text-sm font-semibold">
        {{ t('social.channels') }}
      </h2>
      <span v-else class="text-sm font-semibold lg:sr-only">{{ t('social.channels') }}</span>
      <button
        type="button"
        class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        :aria-label="open ? t('social.collapseChannels') : t('social.expandChannels')"
        @click="emit('update:open', !open)"
      >
        <span class="lg:hidden">
          <Icon :name="open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'" class="size-4" aria-hidden="true" />
        </span>
        <span class="hidden lg:inline-flex">
          <Icon :name="open ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'" class="size-4" aria-hidden="true" />
        </span>
      </button>
    </div>
    <motion.div
      v-if="open"
      class="flex min-h-0 flex-1 flex-col"
      :initial="reduceMotion ? false : { opacity: 0 }"
      :animate="{ opacity: 1 }"
      :transition="{ duration: reduceMotion ? 0 : 0.2 }"
    >
      <div class="flex gap-2 px-3 pb-3">
        <NuxtLink
          :to="localePath('/social/accounts')"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-medium transition hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon name="solar:add-circle-linear" class="size-4" aria-hidden="true" />
          {{ t('social.addChannel') }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/social/accounts')"
          :aria-label="t('social.accounts')"
          :title="t('social.accounts')"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon name="solar:link-linear" class="size-4" aria-hidden="true" />
        </NuxtLink>
      </div>
      <p v-if="accounts.length" class="px-3 pb-2 text-xs leading-relaxed text-muted">
        {{ t('social.channelVisibility') }}
      </p>
      <ul v-if="accounts.length" class="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        <li v-for="account in accounts" :key="account.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            :aria-pressed="!hidden(account.id)"
            :aria-label="hidden(account.id)
              ? t('social.showInCalendar', { name: nameOf(account) })
              : t('social.hideInCalendar', { name: nameOf(account) })"
            @click="emit('toggle', account.id)"
          >
            <SocialPlatformMark :platform="account.platform" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium" :class="hidden(account.id) ? 'text-muted' : 'text-ink'">
                {{ nameOf(account) }}
              </span>
              <span class="block truncate text-xs text-muted">{{ meta(account) }}</span>
            </span>
            <Icon
              :name="hidden(account.id) ? 'solar:eye-closed-linear' : 'solar:eye-linear'"
              class="size-5 shrink-0"
              :class="hidden(account.id) ? 'text-muted' : 'text-ink'"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
      <div v-else class="flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
        <div class="relative mb-5 h-28 w-36" aria-hidden="true">
          <SocialPlatformMark platform="linkedin" size="lg" class="absolute left-0 top-2" />
          <SocialPlatformMark platform="facebook" size="lg" class="absolute right-0 top-0" />
          <SocialPlatformMark platform="instagram" size="lg" class="absolute left-1/2 top-7 z-10 -translate-x-1/2 ring-4 ring-surface" />
        </div>
        <p class="text-base font-semibold">
          {{ t('social.noChannels') }}
        </p>
        <p class="mt-2 max-w-64 text-sm leading-relaxed text-muted">
          {{ t('social.noChannelsLead') }}
        </p>
      </div>
    </motion.div>
  </aside>
</template>
