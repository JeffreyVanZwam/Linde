<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <ChatThread module="outreach" :conversation-id="String(route.params.id)" />
</template>
