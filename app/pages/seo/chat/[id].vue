<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <ChatThread module="seo" :conversation-id="String(route.params.id)" />
</template>
