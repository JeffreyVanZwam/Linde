<script setup lang="ts">
defineProps<{
  modelValue: string | number
  type?: string
  placeholder?: string
}>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <input
    :value="modelValue"
    :type="type || 'text'"
    :placeholder="placeholder"
    class="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>
