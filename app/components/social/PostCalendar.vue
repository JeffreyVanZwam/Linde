<script setup lang="ts">
import { platformLabel } from '~~/shared/platforms'
import type { ChannelAccount } from './ChannelSidebar.vue'

type Performance = 'strong' | 'average' | 'weak' | 'unknown'
type CalendarTarget = {
  accountId: string | null
  platform: string
  publishedAt: string | null
  performance: Performance
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
}
type CalendarPost = {
  id: string
  body: string
  status: string
  scheduledAt: string | null
  source: string
  targets: CalendarTarget[]
}
type CalendarEvent = {
  id: string
  postId: string
  local: boolean
  label: string
  title: string
  detail: string
  platform: string
  href: string
  start: number
  end: number
}
type PlacedEvent = CalendarEvent & { lane: number, lanes: number }

const props = defineProps<{
  posts: CalendarPost[]
  accounts: ChannelAccount[]
  selected?: string[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
  reschedule: [payload: { id: string, scheduledAt: string }]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const hourHeight = 64
const hatch = 'repeating-linear-gradient(-45deg, transparent, transparent 6px, color-mix(in srgb, var(--ink) 9%, transparent) 6px, color-mix(in srgb, var(--ink) 9%, transparent) 7px)'
const storageKey = 'linde.calendar.hiddenAccounts'
const modeKey = 'linde.calendar.mode'
const modes = ['day', 'week', 'month'] as const

const mode = ref<(typeof modes)[number]>('week')
const modeReady = ref(false)
const cursor = ref(new Date())
const now = ref(new Date())
const channelsOpen = ref(true)
const hiddenIds = ref<string[]>([])
const hiddenReady = ref(false)
const scroller = ref<HTMLElement | null>(null)
const picker = ref<HTMLInputElement | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

const labels: Record<Performance, string> = {
  strong: 'social.performanceStrong',
  average: 'social.performanceAverage',
  weak: 'social.performanceWeak',
  unknown: 'social.performanceUnknown',
}

const hidden = computed(() => new Set(hiddenIds.value))
const hours = Array.from({ length: 24 }, (_, hour) => hour)

const gridColumns = computed(() => {
  if (mode.value === 'day') return '3.75rem minmax(0, 1fr)'
  return '3.75rem repeat(7, minmax(7.5rem, 1fr))'
})

const weekdayNames = computed(() => {
  const monday = new Date(2026, 0, 5)
  const format = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)))
})

const rangeLabel = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (mode.value === 'day') return format.format(cursor.value)
  if (mode.value === 'month') return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(cursor.value)
  const start = startOfWeek(cursor.value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${format.format(start)} – ${format.format(end)}`
})

const dateValue = computed(() => {
  const date = cursor.value
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
})

const visibleDays = computed(() => {
  const today = dayKey(now.value)
  if (mode.value === 'month') {
    const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1)
    const lead = (first.getDay() || 7) - 1
    first.setDate(1 - lead)
    return Array.from({ length: 42 }, (_, index) => makeDay(first, index, today))
  }
  const start = mode.value === 'week' ? startOfWeek(cursor.value) : startOfDay(cursor.value)
  const count = mode.value === 'week' ? 7 : 1
  return Array.from({ length: count }, (_, index) => makeDay(start, index, today))
})

watch(hiddenIds, (value) => {
  if (!hiddenReady.value) return
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  }
  catch {
    // De keuze blijft gelden tot de pagina opnieuw laadt.
  }
})

watch(mode, (value) => {
  if (modeReady.value) {
    try {
      localStorage.setItem(modeKey, value)
    }
    catch {
      // De keuze blijft gelden tot de pagina opnieuw laadt.
    }
  }
  nextTick(scrollToNow)
})

onMounted(() => {
  const stored = readMode()
  if (stored) mode.value = stored
  modeReady.value = true
  hiddenIds.value = readHidden()
  hiddenReady.value = true
  timer = setInterval(() => {
    now.value = new Date()
  }, 60_000)
  nextTick(scrollToNow)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function readMode() {
  try {
    const raw = localStorage.getItem(modeKey)
    if (raw === 'day' || raw === 'week' || raw === 'month') return raw
  }
  catch {
    // Ongeldige of geblokkeerde opslag: de standaardweergave blijft staan.
  }
  return null
}

function readHidden() {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  }
  catch {
    return []
  }
}

function toggleAccount(id: string) {
  hiddenIds.value = hiddenIds.value.includes(id)
    ? hiddenIds.value.filter(item => item !== id)
    : [...hiddenIds.value, id]
}

function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  return copy
}

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function asDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function stampKey(value: string | null) {
  const date = asDate(value)
  return date ? dayKey(date) : ''
}

function targetVisible(target: CalendarTarget) {
  if (!props.accounts.length) return true
  if (target.accountId) return !hidden.value.has(target.accountId)
  const same = props.accounts.filter(account => account.platform === target.platform)
  if (!same.length) return true
  return same.some(account => !hidden.value.has(account.id))
}

function visibleTargets(post: CalendarPost) {
  return post.targets.filter(targetVisible)
}

function onDay(post: CalendarPost, key: string) {
  const targets = visibleTargets(post)
  if (!targets.length) return []
  const dated = targets.filter(target => target.publishedAt)
  if (post.status === 'published' && dated.length) {
    return dated.filter(target => stampKey(target.publishedAt) === key)
  }
  return stampKey(post.scheduledAt) === key ? targets : []
}

function summary(targets: CalendarTarget[]) {
  return targets.map((target) => {
    const count = target.impressions ?? target.likes ?? target.comments ?? target.shares
    const known = target.performance !== 'unknown'
    const shown = count == null || (!known && count === 0) ? '' : count.toLocaleString(locale.value)
    const label = known && labels[target.performance] ? t(labels[target.performance]) : ''
    return [shown, label].filter(Boolean).join(' ')
  }).filter(Boolean).join(' · ')
}

function toEvent(post: CalendarPost, targets: CalendarTarget[], key: string): CalendarEvent {
  const times = targets.map(target => asDate(target.publishedAt)).filter((value): value is Date => Boolean(value))
  const when = times.sort((left, right) => left.getTime() - right.getTime())[0] || asDate(post.scheduledAt) || new Date()
  const start = when.getHours() * 60 + when.getMinutes()
  const names = [...new Set(targets.map(target => platformLabel(target.platform)))]
  const body = post.body.trim()
  const label = body ? `${names.join(', ')} · ${body}` : names.join(', ') || post.status
  const detail = summary(targets)
  const time = new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(when)
  return {
    id: `${post.id}-${key}`,
    postId: post.id,
    local: post.source === 'local' && post.status !== 'published',
    label,
    title: [time, label, detail].filter(Boolean).join(' · '),
    detail,
    platform: targets[0]?.platform || 'linkedin',
    href: localePath(post.source === 'local' ? `/social/compose?post=${post.id}` : '/social/published'),
    start,
    end: Math.min(start + 60, 24 * 60),
  }
}

function layoutEvents(events: CalendarEvent[]): PlacedEvent[] {
  const sorted = [...events].sort((left, right) => left.start - right.start || left.end - right.end)
  const placed: PlacedEvent[] = []
  let cluster: PlacedEvent[] = []
  let clusterLanes = 0
  const active: Array<{ end: number, lane: number }> = []

  function flush() {
    for (const item of cluster) item.lanes = clusterLanes
    cluster = []
    clusterLanes = 0
  }

  for (const event of sorted) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const item = active[index]
      if (item && item.end <= event.start) active.splice(index, 1)
    }
    if (!active.length) flush()
    const used = new Set(active.map(item => item.lane))
    let lane = 0
    while (used.has(lane)) lane += 1
    active.push({ end: event.end, lane })
    clusterLanes = Math.max(clusterLanes, lane + 1)
    const item: PlacedEvent = { ...event, lane, lanes: 1 }
    cluster.push(item)
    placed.push(item)
  }
  flush()
  return placed
}

function eventsFor(date: Date) {
  const key = dayKey(date)
  const events = props.posts.flatMap((post) => {
    const targets = onDay(post, key)
    return targets.length ? [toEvent(post, targets, key)] : []
  })
  return layoutEvents(events)
}

function makeDay(start: Date, index: number, today: string) {
  const date = new Date(start)
  date.setDate(start.getDate() + index)
  date.setHours(0, 0, 0, 0)
  const key = dayKey(date)
  return {
    key,
    date,
    weekday: new Intl.DateTimeFormat(locale.value, { weekday: 'long' }).format(date),
    heading: new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
    number: date.getDate(),
    inMonth: date.getMonth() === cursor.value.getMonth(),
    isToday: key === today,
    events: eventsFor(date),
  }
}

function pastHeight(date: Date) {
  const start = startOfDay(date).getTime()
  const end = start + 24 * 60 * 60 * 1000
  const current = now.value.getTime()
  if (current <= start) return 0
  if (current >= end) return 24 * hourHeight
  return ((now.value.getHours() * 60 + now.value.getMinutes()) / 60) * hourHeight
}

function tone(platform: string) {
  if (platform === 'linkedin') return 'bg-[#0A66C2] text-white'
  if (platform === 'facebook') return 'bg-[#1877F2] text-white'
  if (platform === 'instagram') return 'bg-[#C13584] text-white'
  if (platform === 'youtube') return 'bg-[#FF0033] text-white'
  if (platform === 'tiktok') return 'bg-ink text-surface'
  if (platform === 'x') return 'bg-ink text-surface'
  if (platform === 'pinterest') return 'bg-[#E60023] text-white'
  return 'bg-accent text-surface'
}

function dragStart(event: DragEvent, item: CalendarEvent) {
  if (!item.local) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', item.postId)
}

function dropOn(date: Date, event: DragEvent, hour?: number) {
  const id = event.dataTransfer?.getData('text/plain')
  if (!id) return
  const next = new Date(date)
  next.setHours(hour ?? 9, hour == null ? 5 : 0, 0, 0)
  emit('reschedule', { id, scheduledAt: next.toISOString() })
}

function hourFrom(event: DragEvent, column: HTMLElement) {
  const rect = column.getBoundingClientRect()
  const offset = event.clientY - rect.top
  return Math.min(23, Math.max(0, Math.floor(offset / hourHeight)))
}

function eventStyle(event: PlacedEvent) {
  const height = Math.max(36, ((event.end - event.start) / 60) * hourHeight - 6)
  const top = Math.min((event.start / 60) * hourHeight + 3, 24 * hourHeight - height - 3)
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${(event.lane / event.lanes) * 100}% + 4px)`,
    width: `calc(${100 / event.lanes}% - 8px)`,
  }
}

function hourLabel(hour: number) {
  return new Intl.DateTimeFormat(locale.value, { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, hour))
}

function modeLabel(item: (typeof modes)[number]) {
  if (item === 'day') return t('social.day')
  if (item === 'week') return t('social.week')
  return t('social.month')
}

function shift(direction: number) {
  const next = new Date(cursor.value)
  if (mode.value === 'day') next.setDate(next.getDate() + direction)
  else if (mode.value === 'week') next.setDate(next.getDate() + direction * 7)
  else next.setMonth(next.getMonth() + direction)
  cursor.value = next
}

function goToday() {
  now.value = new Date()
  cursor.value = new Date()
  nextTick(scrollToNow)
}

function openDay(date: Date) {
  cursor.value = new Date(date)
  mode.value = 'day'
}

function scrollToNow() {
  const el = scroller.value
  if (!el) return
  if (mode.value === 'month') {
    el.scrollTop = 0
    return
  }
  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  el.scrollTop = Math.max(0, (minutes / 60) * hourHeight - hourHeight)
}

function openPicker() {
  const input = picker.value
  if (!input) return
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
      return
    }
    catch {
      // showPicker weigert zonder gebruikersgebaar in sommige browsers.
    }
  }
  input.click()
}

function onPick(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (!value) return
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return
  cursor.value = new Date(year, month - 1, day)
  nextTick(scrollToNow)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden border-t border-line bg-surface lg:flex-row">
    <ChannelSidebar
      v-model:open="channelsOpen"
      :accounts="accounts"
      :hidden-ids="hiddenIds"
      @toggle="toggleAccount"
    />
    <section class="flex min-h-0 min-w-0 flex-1 flex-col">
      <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-3">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center overflow-hidden rounded-xl border border-line bg-surface">
            <button
              type="button"
              class="inline-flex size-10 items-center justify-center text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              :aria-label="t('social.previous')"
              @click="shift(-1)"
            >
              <Icon name="solar:alt-arrow-left-linear" class="size-4" aria-hidden="true" />
            </button>
            <span class="border-x border-line px-3 py-2 text-sm whitespace-nowrap tabular-nums capitalize">{{ rangeLabel }}</span>
            <button
              type="button"
              class="inline-flex size-10 items-center justify-center text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              :aria-label="t('social.next')"
              @click="shift(1)"
            >
              <Icon name="solar:alt-arrow-right-linear" class="size-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            class="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            @click="goToday"
          >
            {{ t('social.today') }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex rounded-full bg-soft p-1" role="group" :aria-label="t('social.calendar')">
            <button
              v-for="item in modes"
              :key="item"
              type="button"
              class="rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              :class="mode === item ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'"
              :aria-pressed="mode === item"
              @click="mode = item"
            >
              {{ modeLabel(item) }}
            </button>
          </div>
          <button
            type="button"
            class="inline-flex size-10 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            :aria-label="t('social.pickDate')"
            @click="openPicker"
          >
            <Icon name="solar:calendar-linear" class="size-4" aria-hidden="true" />
          </button>
          <input ref="picker" type="date" class="sr-only" tabindex="-1" :value="dateValue" @change="onPick">
        </div>
      </header>
      <div ref="scroller" class="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div v-if="mode === 'month'" class="flex min-h-full flex-col">
          <div class="grid grid-cols-7 border-b border-line">
            <div v-for="name in weekdayNames" :key="name" class="px-2 py-3 text-center text-xs font-medium text-muted capitalize">
              {{ name }}
            </div>
          </div>
          <div class="grid min-h-0 flex-1 grid-cols-7 border-l border-line sm:grid-rows-6">
            <div
              v-for="day in visibleDays"
              :key="day.key"
              class="min-h-24 border-r border-b border-line p-1.5"
              :class="day.inMonth ? '' : 'bg-soft/60'"
              @dragover.prevent
              @drop="dropOn(day.date, $event)"
            >
              <button
                type="button"
                class="rounded-md px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                :class="day.isToday ? 'text-accent' : day.inMonth ? 'text-ink' : 'text-muted'"
                @click="openDay(day.date)"
              >
                <span v-if="day.isToday" class="mr-1 inline-block size-1.5 rounded-full bg-accent align-middle" />
                {{ day.number }}
              </button>
              <div
                v-for="event in day.events.slice(0, 3)"
                :key="event.id"
                class="mt-1 flex items-center gap-1 truncate rounded-md px-1.5 py-1 text-[11px] leading-tight"
                :class="tone(event.platform)"
                :draggable="event.local"
                @dragstart="dragStart($event, event)"
              >
                <input v-if="event.local" type="checkbox" class="size-3" :checked="props.selected?.includes(event.postId)" @click.stop @change="emit('toggle', event.postId)">
                <NuxtLink :to="event.href" :title="event.title" class="truncate">{{ event.label }}</NuxtLink>
              </div>
              <button
                v-if="day.events.length > 3"
                type="button"
                class="mt-1 px-1 text-[11px] text-muted"
                @click="openDay(day.date)"
              >
                +{{ day.events.length - 3 }}
              </button>
            </div>
          </div>
        </div>
        <template v-else>
          <div class="sticky top-0 z-30 grid border-b border-line bg-surface" :style="{ gridTemplateColumns: gridColumns }">
            <div />
            <div
              v-for="day in visibleDays"
              :key="day.key"
              class="border-l border-line px-2 py-3 text-center"
              :aria-current="day.isToday ? 'date' : undefined"
            >
              <p class="text-xs capitalize" :class="day.isToday ? 'font-medium text-accent' : 'text-muted'">
                {{ day.weekday }}
              </p>
              <p class="mt-0.5 text-sm font-semibold tabular-nums" :class="day.isToday ? 'text-accent' : 'text-ink'">
                <span v-if="day.isToday" class="mr-1 inline-block size-1.5 rounded-full bg-accent align-middle" />
                {{ day.heading }}
              </p>
            </div>
          </div>
          <div class="grid" :style="{ gridTemplateColumns: gridColumns }">
            <div>
              <div v-for="hour in hours" :key="hour" class="relative" :style="{ height: `${hourHeight}px` }">
                <span
                  class="absolute right-2 text-[11px] text-muted tabular-nums"
                  :class="hour === 0 ? 'top-1' : '-top-2'"
                >{{ hourLabel(hour) }}</span>
              </div>
            </div>
            <div
              v-for="day in visibleDays"
              :key="day.key"
              class="relative border-l border-line"
              @dragover.prevent
              @drop="dropOn(day.date, $event, hourFrom($event, $event.currentTarget as HTMLElement))"
            >
              <div
                v-if="pastHeight(day.date) > 0"
                class="pointer-events-none absolute inset-x-0 top-0"
                :style="{ height: `${pastHeight(day.date)}px`, backgroundImage: hatch }"
              />
              <div v-for="hour in hours" :key="hour" class="border-b border-line" :style="{ height: `${hourHeight}px` }" />
              <div
                v-for="event in day.events"
                :key="event.id"
                class="absolute z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-xs leading-snug"
                :class="tone(event.platform)"
                :style="eventStyle(event)"
                :draggable="event.local"
                @dragstart="dragStart($event, event)"
              >
                <input v-if="event.local" type="checkbox" class="mr-1 size-3 align-middle" :checked="props.selected?.includes(event.postId)" @click.stop @change="emit('toggle', event.postId)">
                <NuxtLink :to="event.href" :title="event.title" class="font-medium">{{ event.label }}</NuxtLink>
                <span v-if="event.detail" class="block truncate text-[10px] opacity-80">{{ event.detail }}</span>
              </div>
              <div
                v-if="day.isToday"
                class="pointer-events-none absolute inset-x-0 z-20"
                :style="{ top: `${pastHeight(day.date)}px` }"
              >
                <span class="absolute -top-1 left-0 size-2 rounded-full bg-accent" />
                <span class="block h-0.5 bg-accent" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
