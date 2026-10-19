<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const posts = await api<Array<{ id: string, body: string, status: string }>>('/api/social/posts')
const local = computed(() => posts.filter(post => post.status !== 'published').slice(0, 6))
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('social.title') }}
      </h1>
      <p class="mt-3 max-w-2xl text-stone-600">
        {{ t('social.lead') }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <UiButton variant="ghost" :to="localePath('/social/accounts')">{{ t('social.accounts') }}</UiButton>
      <UiButton variant="ghost" :to="localePath('/social/calendar')">{{ t('social.calendar') }}</UiButton>
      <UiButton variant="ghost" :to="localePath('/social/compose')">{{ t('social.compose') }}</UiButton>
      <UiButton :to="localePath('/social/chat/new')">{{ t('social.newChat') }}</UiButton>
    </div>
    <UiCard>
      <h2 class="font-serif text-2xl">
        {{ t('social.compose') }}
      </h2>
      <NuxtLink v-for="post in local" :key="post.id" :to="localePath(`/social/compose?post=${post.id}`)" class="mt-3 block text-sm">
        {{ post.status }} · {{ post.body.slice(0, 100) }}
      </NuxtLink>
    </UiCard>
    <section class="space-y-3">
      <h2 class="font-serif text-2xl">
        {{ t('chat.list') }}
      </h2>
      <ChatList module="social" />
    </section>
  </div>
</template>
