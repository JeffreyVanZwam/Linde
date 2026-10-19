<script setup lang="ts">
defineProps<{ message?: string | null }>()
</script>

<template>
  <p v-if="message" class="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
    {{ message }}
  </p>
</template>
