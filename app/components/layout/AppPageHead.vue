<script setup lang="ts">
defineProps<{
  title: string
  lead?: string
  eyebrow?: string
}>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <p v-if="eyebrow" class="text-sm text-muted">
        {{ eyebrow }}
      </p>
      <h1 class="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {{ title }}
      </h1>
      <p v-if="lead || $slots.lead" class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
        <slot name="lead">
          {{ lead }}
        </slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
