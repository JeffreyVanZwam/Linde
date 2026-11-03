<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: 'surface' | 'soft' | 'highlight' | 'ink'
}>(), {
  tone: 'surface',
})

const toneClass = computed(() => {
  if (props.tone === 'soft') return 'border border-line bg-soft'
  if (props.tone === 'highlight') return 'border border-transparent bg-cta text-cta-ink'
  if (props.tone === 'ink') return 'panel-ink border border-transparent'
  return 'border border-line bg-surface shadow-[0_18px_40px_-32px_rgba(0,0,0,0.45)]'
})
</script>

<template>
  <section :class="['rounded-[1.6rem] p-5 sm:p-6', toneClass]">
    <slot />
  </section>
</template>
