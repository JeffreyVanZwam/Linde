<script setup lang="ts">
import { motion } from 'motion-v'
import { connectProviders, isConnectProvider, platformLabel, type ConnectProvider } from '~~/shared/platforms'

type Performance = 'strong' | 'average' | 'weak' | 'unknown'
type Target = {
  id: string
  platform: string
  body: string
  status: string
  externalUrl: string | null
  publishedAt: string | null
  performance: Performance
  impressions: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  clicks: number | null
}

type Post = {
  id: string
  imageUrl: string | null
  media: { id: string, kind: string } | null
  targets: Target[]
}

const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const posts = ref<Post[]>([])
const loading = ref(true)
const selected = ref<ConnectProvider[]>([])
let request = 0

onMounted(() => {
  void loadPosts()
  void syncAndRefresh()
})

async function loadPosts() {
  const ticket = ++request
  const rows = await api<Post[]>('/api/social/posts').catch(() => [] as Post[])
  if (ticket !== request) return
  posts.value = rows
  loading.value = false
}

async function syncAndRefresh() {
  const synced = await api<{ results: Array<{ warning: string | null }> }>('/api/social/sync', { method: 'POST', body: {} }).catch(() => null)
  if (synced) await loadPosts()
}

const published = computed(() => posts.value.flatMap(post => post.targets
  .filter(target => target.status === 'published')
  .map(target => ({ ...target, media: post.media, imageUrl: post.imageUrl }))))

const items = computed(() => published.value
  .filter(target => !selected.value.length || (isConnectProvider(target.platform) && selected.value.includes(target.platform)))
  .sort((left, right) => (right.publishedAt || '').localeCompare(left.publishedAt || '')))

const tally = computed(() => ({
  strong: items.value.filter(item => item.performance === 'strong').length,
  average: items.value.filter(item => item.performance === 'average').length,
  weak: items.value.filter(item => item.performance === 'weak').length,
}))

function pick(item: ConnectProvider) {
  selected.value = selected.value.includes(item)
    ? selected.value.filter(value => value !== item)
    : [...selected.value, item]
}

function metrics(target: Target) {
  return [
    ['impressions', target.impressions],
    ['reach', target.reach],
    ['likes', target.likes],
    ['comments', target.comments],
    ['shares', target.shares],
    ['saves', target.saves],
    ['clicks', target.clicks],
  ].filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
}
</script>

<template>
  <div class="space-y-6">
    <AppBack to="/social" />
    <AppPageHead :title="t('social.published')" :lead="t('social.publishedLead')" />
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UiCard>
        <p class="text-sm text-muted">{{ t('social.published') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ items.length }}</p>
      </UiCard>
      <UiCard tone="highlight">
        <p class="text-sm opacity-80">{{ t('social.performanceStrong') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ tally.strong }}</p>
      </UiCard>
      <UiCard>
        <p class="text-sm text-muted">{{ t('social.performanceAverage') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ tally.average }}</p>
      </UiCard>
      <UiCard tone="soft">
        <p class="text-sm text-muted">{{ t('social.performanceWeak') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ tally.weak }}</p>
      </UiCard>
    </div>
    <div class="flex flex-wrap gap-2 rounded-[1.4rem] border border-line bg-surface p-3" role="group" :aria-label="t('social.platforms')">
      <button v-for="item in connectProviders" :key="item" type="button"
        class="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium transition duration-200 hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        :class="selected.length && !selected.includes(item) ? 'opacity-40' : ''" :aria-pressed="selected.includes(item)"
        @click="pick(item)">
        <PlatformMark :provider="item" size="xs" />
        <span>{{ platformLabel(item) }}</span>
      </button>
    </div>
    <div
      v-if="loading"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-busy="true"
      :aria-label="t('common.loading')"
    >
      <PublishedPostSkeleton v-for="index in 10" :key="index" />
    </div>
    <p v-else-if="!published.length" class="text-sm text-muted">
      {{ t('social.emptyPublished') }}
      <NuxtLink :to="localePath('/social/accounts')" class="underline">
        {{ t('social.accounts') }}
      </NuxtLink>
    </p>
    <p v-else-if="!items.length" class="text-sm text-muted">
      {{ t('social.emptyPlatform') }}
    </p>
    <motion.div v-else :key="selected.join(',') || 'all'"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.25 }">
      <PublishedPostCard v-for="target in items" :key="target.id" :platform="target.platform" :body="target.body"
        :published-at="target.publishedAt" :performance="target.performance" :external-url="target.externalUrl"
        :media="target.media" :image-url="target.imageUrl" :metrics="metrics(target)" />
    </motion.div>
  </div>
</template>
