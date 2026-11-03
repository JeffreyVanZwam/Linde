<script setup lang="ts">
withDefaults(defineProps<{
  id: string
  title: string
  hint?: string
  layout?: 'stack' | 'split' | 'grid'
}>(), {
  layout: 'stack',
})
</script>

<template>
  <section :id="`dossier-${id}`" class="rounded-[1.6rem] border border-line bg-surface p-4 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.35)] sm:p-5">
    <h3 class="font-display text-2xl font-semibold tracking-tight">
      {{ title }}
    </h3>
    <p v-if="hint" class="mt-1 max-w-2xl text-sm text-muted">
      {{ hint }}
    </p>
    <div
      class="mt-4"
      :class="layout === 'split' ? 'grid gap-4 md:grid-cols-2' : layout === 'grid' ? 'grid gap-3 md:grid-cols-2' : 'space-y-4'"
    >
      <slot />
    </div>
  </section>
</template>
