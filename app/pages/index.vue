<script setup lang="ts">
import { motion } from 'motion-v'

const { t } = useI18n()
const localePath = useLocalePath()
const me = useState<{ user: { name: string }, brand: { companyName: string | null, toneOfVoice: string | null, colors: string[] } | null }>('me')

const api = useRequestFetch()
const [posts, campaigns] = await Promise.all([
  api<Array<{ id: string, body: string, status: string, scheduledAt: string | null }>>('/api/social/posts'),
  api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns'),
])

const upcoming = computed(() => posts.filter(post => post.status === 'scheduled').slice(0, 5))
const stats = computed(() => [
  { label: t('home.upcoming'), value: upcoming.value.length },
  { label: t('home.campaigns'), value: campaigns.length },
])
</script>

<template>
  <div class="space-y-6">
    <div class="grid items-end gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div>
        <p class="text-sm text-muted">
          {{ t('home.eyebrow') }}
        </p>
        <h1 class="mt-1 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          {{ me?.user.name }}
        </h1>
        <p class="mt-3 max-w-xl text-muted">
          {{ t('home.lead') }}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <motion.article
          v-for="(stat, index) in stats"
          :key="stat.label"
          class="rounded-[1.4rem] border border-line bg-surface p-4 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.45)]"
          :initial="{ opacity: 0, y: 12 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: 0.08 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }"
        >
          <p class="text-sm text-muted">
            {{ stat.label }}
          </p>
          <p class="mt-3 font-display text-4xl font-semibold tracking-tight">
            {{ stat.value }}
          </p>
        </motion.article>
      </div>
    </div>

    <UiCard v-if="me?.brand">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium text-muted">
            {{ t('nav.brain') }}
          </p>
          <p class="mt-2 font-display text-3xl font-semibold tracking-tight">
            {{ me.brand.companyName }}
          </p>
          <p class="mt-2 max-w-2xl text-sm text-muted">
            {{ me.brand.toneOfVoice }}
          </p>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <span v-for="color in me.brand.colors" :key="color" class="size-8 rounded-full border border-line" :style="{ background: color }" />
      </div>
    </UiCard>

    <div class="grid gap-4 lg:grid-cols-3">
      <UiCard>
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('home.upcoming') }}
        </h2>
        <p v-if="!upcoming.length" class="mt-3 text-sm text-muted">
          {{ t('home.emptyPosts') }}
        </p>
        <NuxtLink
          v-for="post in upcoming"
          :key="post.id"
          :to="localePath(`/social/compose?post=${post.id}`)"
          class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-3 text-sm transition duration-200 hover:bg-soft"
        >
          <span class="line-clamp-2">{{ post.body.slice(0, 90) }}</span>
          <Icon name="solar:alt-arrow-right-linear" class="size-4 shrink-0 text-muted" />
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('home.campaigns') }}
        </h2>
        <p v-if="!campaigns.length" class="mt-3 text-sm text-muted">
          {{ t('home.emptyCampaigns') }}
        </p>
        <NuxtLink
          v-for="campaign in campaigns.slice(0, 5)"
          :key="campaign.id"
          :to="localePath(`/outreach/${campaign.id}`)"
          class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-3 text-sm transition duration-200"
        >
          <span class="min-w-0 truncate">{{ campaign.name }}</span>
          <span class="shrink-0 rounded-full bg-contrast px-2 py-0.5 text-[11px] font-semibold text-contrast-ink">{{ campaign.status }}</span>
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('home.chats') }}
        </h2>
        <ChatList class="mt-3" plain :limit="5" :empty="t('home.emptyChats')" />
      </UiCard>
    </div>
  </div>
</template>
