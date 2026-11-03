<script setup lang="ts">
import { isSocialPlatform, platformIcons } from '~~/shared/platforms'

const props = withDefaults(defineProps<{
  platform: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const box = computed(() => props.size === 'sm' ? 'size-4' : props.size === 'lg' ? 'size-14' : 'size-9')
const glyph = computed(() => props.size === 'sm' ? '!size-4' : props.size === 'lg' ? '!size-14' : '!size-9')
const icon = computed(() => isSocialPlatform(props.platform) ? platformIcons[props.platform] : '')
</script>

<template>
  <span class="inline-flex shrink-0 items-center justify-center" :class="box" aria-hidden="true">
    <Icon v-if="icon" :name="icon" mode="svg" :class="glyph" />
    <span v-else class="flex size-full items-center justify-center rounded-full bg-soft text-[11px] font-semibold text-ink">
      {{ platform.slice(0, 1).toUpperCase() }}
    </span>
  </span>
</template>
