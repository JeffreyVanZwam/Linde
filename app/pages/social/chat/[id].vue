<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))
</script>

<template>
  <ChatThread module="social" :conversation-id="id" />
</template>
