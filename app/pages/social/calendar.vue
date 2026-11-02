<script setup lang="ts">
type Performance = 'strong' | 'average' | 'weak' | 'unknown'
type CalendarPost = {
  id: string
  body: string
  status: string
  scheduledAt: string | null
  source: string
  targets: Array<{
    accountId: string | null
    platform: string
    publishedAt: string | null
    performance: Performance
    impressions: number | null
    likes: number | null
    comments: number | null
    shares: number | null
  }>
}
type CalendarAccount = {
  id: string
  platform: string
  displayName: string
  authorType: string | null
}

const { t } = useI18n()
const api = useRequestFetch()
const posts = ref<CalendarPost[]>([])
const accounts = ref<CalendarAccount[]>([])
const warning = ref('')
let request = 0

onMounted(() => {
  void loadPosts()
  void syncAndRefresh()
})

async function loadPosts() {
  const ticket = ++request
  const [postRows, accountRows] = await Promise.all([
    api<CalendarPost[]>('/api/social/posts').catch(() => [] as CalendarPost[]),
    api<CalendarAccount[]>('/api/social/accounts').catch(() => [] as CalendarAccount[]),
  ])
  if (ticket !== request) return
  posts.value = postRows
  accounts.value = accountRows
}

async function syncAndRefresh() {
  const synced = await api<{ results: Array<{ warning: string | null }> }>('/api/social/sync', { method: 'POST', body: {} }).catch(() => null)
  const message = (synced?.results || []).map(result => result.warning).filter((item): item is string => Boolean(item)).join(' ')
  if (message) warning.value = message
  if (synced) await loadPosts()
}
</script>

<template>
  <div class="-mx-4 -mb-[max(4.5rem,env(safe-area-inset-bottom))] flex h-[calc(100dvh-7.75rem)] min-h-[36rem] flex-col overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mb-10 lg:h-[calc(100dvh-4.5rem)]">
    <h1 class="sr-only">
      {{ t('social.calendar') }}
    </h1>
    <div v-if="warning" class="shrink-0 px-4 pb-3 sm:px-6 lg:px-8">
      <UiAlert :message="warning" />
    </div>
    <PostCalendar class="min-h-0 flex-1" :posts="posts" :accounts="accounts" />
  </div>
</template>
