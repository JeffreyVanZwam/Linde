<script setup lang="ts">
defineProps<{ id: string, title: string, hint?: string }>()
</script>

<template>
  <section :id="`dossier-${id}`" class="scroll-mt-6 rounded-[1.25rem] border border-line bg-surface p-4 sm:p-5">
    <h3 class="font-display text-2xl font-semibold tracking-tight">
      {{ title }}
    </h3>
    <p v-if="hint" class="mt-1 max-w-2xl text-sm text-muted">
      {{ hint }}
    </p>
    <div class="mt-4 space-y-4">
      <slot />
    </div>
  </section>
</template>
