<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const posts = await api<Array<{ id: string, body: string, status: string }>>('/api/social/posts')
const local = computed(() => posts.filter(post => post.status !== 'published').slice(0, 6))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-5xl font-semibold tracking-tight">
          {{ t('social.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-muted">
          {{ t('social.lead') }}
        </p>
      </div>
      <UiButton :to="localePath('/social/chat/new')">
        {{ t('social.newChat') }}
      </UiButton>
    </div>
    <div class="grid gap-4 lg:grid-cols-5">
      <UiCard class="lg:col-span-3">
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('social.compose') }}
        </h2>
        <NuxtLink
          v-for="post in local"
          :key="post.id"
          :to="localePath(`/social/compose?post=${post.id}`)"
          class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-3 text-sm transition duration-200"
        >
          <span class="min-w-0">
            <span class="mr-2 rounded-full bg-contrast px-2 py-0.5 text-[11px] font-semibold text-contrast-ink">{{ post.status }}</span>
            {{ post.body.slice(0, 100) }}
          </span>
        </NuxtLink>
      </UiCard>
      <section class="space-y-3 lg:col-span-2">
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('chat.list') }}
        </h2>
        <ChatList module="social" />
      </section>
    </div>
  </div>
</template>
