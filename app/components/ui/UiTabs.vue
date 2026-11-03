<script setup lang="ts">
const model = defineModel<string>({ required: true })

defineProps<{
  items: Array<{ id: string, label: string }>
  label?: string
}>()
</script>

<template>
  <div
    class="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1"
    role="tablist"
    :aria-label="label"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      role="tab"
      class="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition duration-200"
      :class="model === item.id ? 'bg-cta text-cta-ink' : 'text-muted hover:bg-soft hover:text-ink'"
      :aria-selected="model === item.id"
      @click="model = item.id"
    >
      {{ item.label }}
    </button>
  </div>
</template>
