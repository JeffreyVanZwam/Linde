<script setup lang="ts">
const props = withDefaults(defineProps<{
  platform: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const box = computed(() => props.size === 'sm' ? 'size-4' : props.size === 'lg' ? 'size-14' : 'size-9')
const tone = computed(() => {
  if (props.platform === 'linkedin') return 'bg-[#0A66C2] text-white'
  if (props.platform === 'facebook') return 'bg-[#1877F2] text-white'
  if (props.platform === 'instagram') return 'bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_42%,#d6249f_62%,#285AEB_92%)] text-white'
  if (props.platform === 'youtube') return 'bg-[#FF0033] text-white'
  if (props.platform === 'tiktok') return 'bg-ink text-surface'
  return 'bg-soft text-ink'
})
</script>

<template>
  <span class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full" :class="[box, tone]">
    <svg viewBox="0 0 24 24" class="size-[58%]" fill="currentColor" aria-hidden="true">
      <path v-if="platform === 'linkedin'" d="M5.7 8.7H3V21h2.7V8.7zM4.3 3.2A1.7 1.7 0 1 0 4.3 6.6 1.7 1.7 0 0 0 4.3 3.2zM21 21h-2.7v-6c0-1.8-.7-3-2.3-3-1.2 0-1.8.8-2.1 1.6-.1.3-.1.7-.1 1V21H11V8.7h2.6v1.7c.5-.9 1.6-2.1 3.8-2.1 2.8 0 4.6 1.8 4.6 5.3V21z" />
      <path v-else-if="platform === 'facebook'" d="M14.2 8.2V6.6c0-.8.4-1.1 1.3-1.1H17V3h-2.2C12 3 10.8 4.3 10.8 6.5v1.7H9v2.6h1.8V21h2.8v-9.2h2.3l.4-2.6h-2.1z" />
      <path v-else-if="platform === 'youtube'" d="M22.2 12.2s0-3-.4-4.4c-.2-.9-.9-1.6-1.8-1.8C18.4 5.6 12 5.6 12 5.6s-6.4 0-8 .4c-.9.2-1.6.9-1.8 1.8C1.8 9.2 1.8 12.2 1.8 12.2s0 3 .4 4.4c.2.9.9 1.6 1.8 1.8 1.6.4 8 .4 8 .4s6.4 0 8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.4.4-4.4zM10 15.4V9l5.2 3.2L10 15.4z" />
      <path v-else-if="platform === 'tiktok'" d="M14.2 3.2c.4 2.4 1.8 4 4.2 4.3v2.6c-1.4 0-2.7-.4-3.9-1.2v6.4a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.8a2.8 2.8 0 1 0 1.9 2.6V3.2h2.4z" />
      <g v-else-if="platform === 'instagram'" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </g>
      <text v-else x="12" y="16" text-anchor="middle" font-size="11" font-family="sans-serif">{{ platform.slice(0, 1).toUpperCase() }}</text>
    </svg>
  </span>
</template>
