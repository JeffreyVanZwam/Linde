<script setup lang="ts">
defineProps<{ modelValue: string, rows?: number, placeholder?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <textarea
    :value="modelValue"
    :rows="rows || 5"
    :placeholder="placeholder"
    class="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-contrast focus:ring-2 focus:ring-contrast"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
