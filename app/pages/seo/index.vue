<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const drafts = await api<Array<{ id: string, title: string }>>('/api/seo/drafts')
const articles = await api<Array<{ id: string, title: string, url: string }>>('/api/seo/articles')
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-5xl">
          {{ t('seo.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-stone-600">
          {{ t('seo.lead') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="ghost" :to="localePath('/seo/settings')">{{ t('seo.settings') }}</UiButton>
        <UiButton :to="localePath('/seo/chat/new')">{{ t('seo.newChat') }}</UiButton>
      </div>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard>
        <h2 class="font-serif text-2xl">
          {{ t('seo.drafts') }}
        </h2>
        <p v-if="!drafts.length" class="mt-3 text-sm text-stone-500">
          {{ t('seo.empty') }}
        </p>
        <NuxtLink v-for="draft in drafts" :key="draft.id" :to="localePath(`/seo/articles/${draft.id}`)" class="mt-3 block text-sm">
          {{ draft.title }}
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-serif text-2xl">
          {{ t('seo.inventory') }}
        </h2>
        <a v-for="article in articles" :key="article.id" :href="article.url" class="mt-3 block text-sm text-accent" target="_blank">
          {{ article.title }}
        </a>
      </UiCard>
    </div>
    <section class="space-y-3">
      <h2 class="font-serif text-2xl">
        {{ t('chat.list') }}
      </h2>
      <ChatList module="seo" />
    </section>
  </div>
</template>
