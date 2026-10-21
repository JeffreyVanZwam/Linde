<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <label class="block space-y-1.5 text-sm">
    <span class="font-medium text-ink">{{ label }}</span>
    <slot />
  </label>
</template>
