<script setup lang="ts">
const { id, current } = useTheme()

useHead(computed(() => ({
  htmlAttrs: { 'data-theme': id.value },
  meta: [{ key: 'theme-color', name: 'theme-color', content: current.value.accent }],
})))
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
