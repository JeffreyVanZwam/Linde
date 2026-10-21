<script setup lang="ts">
const props = defineProps<{
  posts: Array<{
    id: string
    body: string
    status: string
    scheduledAt: string | null
    source: string
    targets: Array<{ platform: string }>
  }>
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const mode = ref<'month' | 'week'>('month')
const cursor = ref(new Date())
const platform = ref('all')

const filtered = computed(() => props.posts.filter((post) => {
  if (platform.value === 'all') return true
  return post.targets.some(target => target.platform === platform.value)
}))

const days = computed(() => {
  const start = new Date(cursor.value)
  if (mode.value === 'week') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    return Array.from({ length: 7 }, (_, index) => dayAt(start, index))
  }
  const first = new Date(start.getFullYear(), start.getMonth(), 1)
  const lead = (first.getDay() || 7) - 1
  first.setDate(1 - lead)
  return Array.from({ length: 42 }, (_, index) => dayAt(first, index))
})

function dayAt(start: Date, index: number) {
  const date = new Date(start)
  date.setDate(start.getDate() + index)
  const key = date.toISOString().slice(0, 10)
  return {
    key,
    label: date.getDate(),
    inMonth: date.getMonth() === cursor.value.getMonth(),
    posts: filtered.value.filter((post) => {
      const stamp = post.scheduledAt || ''
      return stamp.slice(0, 10) === key
    }),
  }
}

function shift(direction: number) {
  const next = new Date(cursor.value)
  if (mode.value === 'week') next.setDate(next.getDate() + direction * 7)
  else next.setMonth(next.getMonth() + direction)
  cursor.value = next
}

const platforms = ['all', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok']
const weekdays = computed(() => {
  const monday = new Date(2026, 0, 5)
  const format = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)))
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-2">
        <UiButton variant="ghost" @click="shift(-1)">
          ←
        </UiButton>
        <UiButton variant="ghost" @click="cursor = new Date()">
          {{ t('social.calendar') }}
        </UiButton>
        <UiButton variant="ghost" @click="shift(1)">
          →
        </UiButton>
      </div>
      <div class="flex gap-2">
        <UiButton :variant="mode === 'month' ? 'primary' : 'ghost'" @click="mode = 'month'">
          {{ t('social.month') }}
        </UiButton>
        <UiButton :variant="mode === 'week' ? 'primary' : 'ghost'" @click="mode = 'week'">
          {{ t('social.week') }}
        </UiButton>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="item in platforms"
        :key="item"
        type="button"
        class="min-h-11 rounded-full px-3 py-2 text-xs"
        :class="platform === item ? 'bg-cta text-cta-ink' : 'bg-soft text-muted'"
        @click="platform = item"
      >
        {{ item === 'all' ? t('social.all') : item }}
      </button>
    </div>
    <div v-if="mode === 'month'" class="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted">
      <span v-for="day in weekdays" :key="day">{{ day }}</span>
    </div>
    <div class="grid gap-1 sm:gap-2" :class="mode === 'week' ? 'grid-cols-1 sm:grid-cols-7' : 'grid-cols-7'">
      <div
        v-for="day in days"
        :key="day.key"
        class="rounded-2xl border border-line bg-surface p-1.5 sm:p-2"
        :class="[
          day.inMonth || mode === 'week' ? '' : 'opacity-40',
          mode === 'week' ? 'min-h-24' : 'min-h-14 sm:min-h-28',
        ]"
      >
        <p class="text-xs text-muted">
          {{ day.label }}
        </p>
        <NuxtLink
          v-for="post in day.posts"
          :key="post.id"
          :to="localePath(post.source === 'local' ? `/social/compose?post=${post.id}` : '/social/calendar')"
          class="mt-1 block truncate rounded-xl bg-accent/10 px-2 py-1 text-xs text-accent"
        >
          {{ post.targets.map(target => target.platform).join(', ') || post.status }} · {{ post.body.slice(0, 42) }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
