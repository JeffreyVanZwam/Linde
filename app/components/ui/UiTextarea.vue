<script setup lang="ts">
defineProps<{ modelValue: string, rows?: number, placeholder?: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <textarea
    :value="modelValue"
    :rows="rows || 5"
    :placeholder="placeholder"
    class="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
