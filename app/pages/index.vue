<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const me = useState<{ user: { name: string }, brand: { companyName: string | null, toneOfVoice: string | null, colors: string[] } | null }>('me')

const api = useRequestFetch()
const [posts, campaigns] = await Promise.all([
  api<Array<{ id: string, body: string, status: string, scheduledAt: string | null }>>('/api/social/posts'),
  api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns'),
])

const scheduled = computed(() => posts.filter(post => post.status === 'scheduled'))
const upcoming = computed(() => scheduled.value.slice(0, 4))
const publishedCount = computed(() => posts.filter(post => post.status === 'published').length)
const today = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date()))

const days = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 0, 5 + index)))
})

const bars = computed(() => {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const post of posts) {
    if (!post.scheduledAt) continue
    const date = new Date(post.scheduledAt)
    if (Number.isNaN(date.getTime())) continue
    counts[(date.getDay() + 6) % 7] += 1
  }
  const max = Math.max(1, ...counts)
  const peak = Math.max(...counts)
  return counts.map(count => ({
    count,
    height: count ? Math.max(22, Math.round((count / max) * 100)) : 10,
    peak: count > 0 && count === peak,
  }))
})

const ring = computed(() => {
  const groups = new Map<string, number>()
  for (const campaign of campaigns) groups.set(campaign.status, (groups.get(campaign.status) || 0) + 1)
  const entries = [...groups.entries()]
  const total = campaigns.length || 1
  const palette = ['var(--accent)', 'var(--contrast)', 'var(--accent-2)', 'var(--muted)']
  let cursor = 0
  const stops = entries.map(([, count], index) => {
    const start = cursor
    cursor += (count / total) * 100
    return `${palette[index % palette.length]} ${start}% ${cursor}%`
  })
  return {
    entries,
    background: entries.length ? `conic-gradient(${stops.join(',')})` : 'var(--line)',
  }
})

const modules = computed(() => [
  { to: '/strategy', label: t('nav.strategy'), text: t('strategy.lead'), icon: 'solar:chat-round-dots-bold-duotone', class: 'border border-line bg-surface' },
  { to: '/social', label: t('nav.social'), text: t('social.lead'), icon: 'solar:share-circle-bold-duotone', class: 'bg-cta text-cta-ink' },
  { to: '/seo', label: t('nav.seo'), text: t('seo.lead'), icon: 'solar:document-text-bold-duotone', class: 'panel-ink' },
  { to: '/outreach', label: t('nav.outreach'), text: t('outreach.lead'), icon: 'solar:letter-bold-duotone', class: 'border border-line bg-soft' },
])
</script>

<template>
  <div class="space-y-4">
    <AppPageHead :title="me?.user.name || t('nav.home')" :eyebrow="t('home.eyebrow')" :lead="t('home.lead')">
      <template #actions>
        <span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm text-muted">
          <Icon name="solar:calendar-linear" class="size-4" />
          {{ today }}
        </span>
      </template>
    </AppPageHead>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <UiCard tone="ink" class="flex min-h-72 flex-col justify-between md:col-span-2 xl:col-span-3 xl:row-span-2">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.16em] opacity-70">
            {{ t('nav.brain') }}
          </p>
          <p class="mt-3 font-display text-3xl font-semibold tracking-tight">
            {{ me?.brand?.companyName || t('brain.title') }}
          </p>
          <p v-if="me?.brand?.toneOfVoice" class="mt-3 line-clamp-4 text-sm leading-relaxed opacity-80">
            {{ me.brand.toneOfVoice }}
          </p>
          <p v-else class="mt-3 text-sm opacity-80">
            {{ t('brain.lead') }}
          </p>
        </div>
        <div>
          <div v-if="me?.brand?.colors.length" class="mb-4 flex gap-2">
            <span
              v-for="color in me.brand.colors"
              :key="color"
              class="size-8 rounded-2xl ring-2 ring-white/30"
              :style="{ background: color }"
            />
          </div>
          <UiButton :to="localePath('/brain')">
            {{ t('nav.brain') }}
            <Icon name="solar:arrow-right-linear" class="size-4" />
          </UiButton>
        </div>
      </UiCard>

      <UiCard class="xl:col-span-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-muted">
              {{ t('home.upcoming') }}
            </p>
            <p class="mt-1 font-display text-5xl font-semibold tracking-tight">
              {{ scheduled.length }}
            </p>
          </div>
          <Icon name="solar:calendar-mark-bold-duotone" class="size-6 text-accent" />
        </div>
        <div class="mt-6 flex h-28 items-end gap-2">
          <div v-for="(bar, index) in bars" :key="days[index]" class="flex flex-1 flex-col items-center gap-2">
            <div class="flex h-20 w-full items-end">
              <div
                class="w-full rounded-t-xl transition-all"
                :class="bar.peak ? 'bg-cta' : 'bg-soft'"
                :style="{ height: `${bar.height}%` }"
              />
            </div>
            <span class="text-[11px] text-muted">{{ days[index] }}</span>
          </div>
        </div>
      </UiCard>

      <UiCard tone="highlight" class="flex flex-col justify-between xl:col-span-4">
        <div class="flex items-start justify-between">
          <p class="text-sm font-medium opacity-80">
            {{ t('social.published') }}
          </p>
          <Icon name="solar:graph-up-bold-duotone" class="size-6" />
        </div>
        <p class="mt-6 font-display text-5xl font-semibold tracking-tight">
          {{ publishedCount }}
        </p>
        <NuxtLink :to="localePath('/social/published')" class="mt-4 inline-flex items-center gap-1 text-sm font-medium">
          {{ t('social.published') }}
          <Icon name="solar:arrow-right-up-linear" class="size-4" />
        </NuxtLink>
      </UiCard>

      <UiCard class="xl:col-span-5">
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-display text-xl font-semibold tracking-tight">
            {{ t('home.upcoming') }}
          </h2>
          <NuxtLink :to="localePath('/social/calendar')" class="text-sm font-medium text-accent">
            {{ t('social.calendar') }}
          </NuxtLink>
        </div>
        <p v-if="!upcoming.length" class="mt-4 text-sm text-muted">
          {{ t('home.emptyPosts') }}
        </p>
        <div v-else class="mt-4 grid gap-2">
          <NuxtLink
            v-for="post in upcoming"
            :key="post.id"
            :to="localePath(`/social/compose?post=${post.id}`)"
            class="rounded-2xl bg-soft px-3 py-3 text-sm transition duration-200 hover:-translate-y-0.5"
          >
            <span class="line-clamp-2">{{ post.body.slice(0, 110) }}</span>
          </NuxtLink>
        </div>
      </UiCard>

      <UiCard class="xl:col-span-4">
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('home.chats') }}
        </h2>
        <ChatList class="mt-3" plain :limit="4" :empty="t('home.emptyChats')" />
      </UiCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <UiCard class="flex flex-col justify-between sm:flex-row sm:items-center">
        <div>
          <p class="text-sm text-muted">
            {{ t('home.campaigns') }}
          </p>
          <p class="mt-1 font-display text-5xl font-semibold tracking-tight">
            {{ campaigns.length }}
          </p>
        </div>
        <div class="mt-4 flex items-center gap-4 sm:mt-0">
          <div class="relative size-24 shrink-0 rounded-full" :style="{ background: ring.background }">
            <div class="absolute inset-3 flex items-center justify-center rounded-full bg-surface text-sm font-semibold">
              {{ campaigns.length }}
            </div>
          </div>
          <div class="min-w-0 space-y-1 text-sm">
            <p v-if="!ring.entries.length" class="text-muted">
              {{ t('home.emptyCampaigns') }}
            </p>
            <p v-for="[status, count] in ring.entries" :key="status" class="flex items-center justify-between gap-4">
              <span class="truncate text-muted">{{ status }}</span>
              <span class="font-medium">{{ count }}</span>
            </p>
          </div>
        </div>
      </UiCard>
      <div class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="campaign in campaigns.slice(0, 4)"
          :key="campaign.id"
          :to="localePath(`/outreach/${campaign.id}`)"
          class="flex items-center justify-between gap-3 rounded-[1.4rem] border border-line bg-surface px-4 py-4 transition duration-200 hover:-translate-y-0.5"
        >
          <span class="min-w-0 truncate font-medium">{{ campaign.name }}</span>
          <span class="shrink-0 rounded-full bg-cta px-2.5 py-1 text-[11px] font-semibold text-cta-ink">{{ campaign.status }}</span>
        </NuxtLink>
        <p v-if="!campaigns.length" class="rounded-[1.4rem] border border-dashed border-line px-4 py-6 text-sm text-muted sm:col-span-2">
          {{ t('home.emptyCampaigns') }}
        </p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="item in modules"
        :key="item.to"
        :to="localePath(item.to)"
        class="flex min-h-36 flex-col justify-between rounded-[1.6rem] p-5 transition duration-200 hover:-translate-y-0.5"
        :class="item.class"
      >
        <Icon :name="item.icon" class="size-7" />
        <span>
          <span class="block font-display text-xl font-semibold tracking-tight">{{ item.label }}</span>
          <span class="mt-1 line-clamp-2 block text-sm opacity-75">{{ item.text }}</span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
