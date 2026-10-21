<script setup lang="ts">
const { t } = useI18n()
const api = useRequestFetch()
const posts = await api<Array<{
  id: string
  body: string
  status: string
  scheduledAt: string | null
  source: string
  targets: Array<{ platform: string }>
}>>('/api/social/posts')
</script>

<template>
  <div class="space-y-6">
    <AppBack to="/social" />
    <h1 class="font-display font-semibold tracking-tight text-5xl">
      {{ t('social.calendar') }}
    </h1>
    <PostCalendar :posts="posts" />
  </div>
</template>
