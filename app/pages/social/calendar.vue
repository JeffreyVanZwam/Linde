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
const query = ref('')
const selected = ref<string[]>([])
const when = ref('')
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

const shown = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return posts.value
  return posts.value.filter(post => post.body.toLowerCase().includes(needle))
})

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter(item => item !== id) : [...selected.value, id]
}

async function bulk(action: 'delete' | 'schedule' | 'draft') {
  if (!selected.value.length) return
  await api('/api/social/posts/bulk', {
    method: 'POST',
    body: { ids: selected.value, action, scheduledAt: when.value ? new Date(when.value).toISOString() : undefined },
  })
  selected.value = []
  await loadPosts()
}

async function reschedule(payload: { id: string, scheduledAt: string }) {
  await api('/api/social/posts/bulk', {
    method: 'POST',
    body: { ids: [payload.id], action: 'schedule', scheduledAt: payload.scheduledAt },
  })
  await loadPosts()
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
    <div class="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3 sm:px-6 lg:px-8">
      <input v-model="query" class="min-w-48 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm" :placeholder="t('forge.search')">
      <input v-model="when" type="datetime-local" class="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
      <button type="button" class="rounded-xl bg-cta px-3 py-2 text-sm text-cta-ink" :disabled="!selected.length" @click="bulk('schedule')">{{ t('forge.bulkSchedule') }}</button>
      <button type="button" class="rounded-xl border border-line px-3 py-2 text-sm" :disabled="!selected.length" @click="bulk('draft')">{{ t('forge.bulkDraft') }}</button>
      <button type="button" class="rounded-xl border border-line px-3 py-2 text-sm" :disabled="!selected.length" @click="bulk('delete')">{{ t('forge.bulkDelete') }}</button>
    </div>
    <PostCalendar class="min-h-0 flex-1" :posts="shown" :accounts="accounts" :selected="selected" @toggle="toggle" @reschedule="reschedule" />
  </div>
</template>
