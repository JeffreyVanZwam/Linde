<script setup lang="ts">
import { isConnectProvider, platformLabel } from '~~/shared/platforms'

type Performance = 'strong' | 'average' | 'weak' | 'unknown'

const props = defineProps<{
  platform: string
  body: string
  publishedAt: string | null
  performance: Performance
  externalUrl: string | null
  media: { id: string, kind: string } | null
  imageUrl?: string | null
  metrics: Array<[string, number]>
}>()

const { t, locale } = useI18n()

const labels: Record<Performance, string> = {
  strong: 'social.performanceStrong',
  average: 'social.performanceAverage',
  weak: 'social.performanceWeak',
  unknown: 'social.performanceUnknown',
}

const when = computed(() => {
  if (!props.publishedAt) return ''
  const date = new Date(props.publishedAt)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(date)
})

const mark = computed(() => isConnectProvider(props.platform) ? props.platform : null)
const broken = ref(false)
const picture = computed(() => {
  if (props.media?.kind === 'image') return { kind: 'image' as const, src: `/api/media/${props.media.id}?thumb=800x0` }
  if (props.media?.kind === 'video') return { kind: 'video' as const, src: `/api/media/${props.media.id}` }
  if (props.imageUrl) return { kind: 'image' as const, src: props.imageUrl }
  return null
})
const visual = computed(() => picture.value && !broken.value ? picture.value : null)
</script>

<template>
  <article
    class="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_18px_40px_-32px_rgba(0,0,0,0.45)]">
    <div v-if="visual" class="relative">
      <img v-if="visual.kind === 'image'" :src="visual.src" alt="" class="aspect-square w-full object-cover"
        loading="lazy" referrerpolicy="no-referrer" @error="broken = true">
      <video v-else :src="visual.src" class="aspect-square w-full bg-black object-cover" controls playsinline
        preload="metadata" />
      <span v-if="mark" class="absolute left-4 top-4 rounded-2xl">
        <PlatformMark :provider="mark" size="xs" />
        <span class="sr-only">{{ platformLabel(mark) }}</span>
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-3 p-4">
      <PlatformMark v-if="mark && !visual" :provider="mark" size="sm" />
      <p class="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed" :title="body">
        {{ body }}
      </p>
      <div class="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted">
        <span v-if="when">{{ when }}</span>
        <span v-if="performance !== 'unknown'" class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          :class="performance === 'strong' ? 'bg-cta text-cta-ink' : 'bg-soft text-muted'">
          {{ t(labels[performance]) }}
        </span>
      </div>
      <p v-if="metrics.length" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span v-for="[key, value] in metrics" :key="key">
          {{ t(`social.${key}`) }} {{ value.toLocaleString(locale) }}
        </span>
      </p>
      <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer"
        class="text-sm font-medium text-accent underline">
        {{ t('social.openPost') }}
      </a>
    </div>
  </article>
</template>
