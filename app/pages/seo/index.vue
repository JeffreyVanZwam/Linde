<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const drafts = await api<Array<{ id: string, title: string }>>('/api/seo/drafts')
const articles = await api<Array<{ id: string, title: string, url: string }>>('/api/seo/articles')
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-5xl font-semibold tracking-tight">
          {{ t('seo.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-muted">
          {{ t('seo.lead') }}
        </p>
      </div>
      <UiButton :to="localePath('/seo/chat/new')">
        {{ t('seo.newChat') }}
      </UiButton>
    </div>
    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard>
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('seo.drafts') }}
        </h2>
        <p v-if="!drafts.length" class="mt-3 text-sm text-muted">
          {{ t('seo.empty') }}
        </p>
        <NuxtLink
          v-for="draft in drafts"
          :key="draft.id"
          :to="localePath(`/seo/articles/${draft.id}`)"
          class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-3 text-sm transition duration-200"
        >
          <span class="min-w-0 truncate">{{ draft.title }}</span>
          <Icon name="solar:alt-arrow-right-linear" class="size-4 shrink-0 text-muted" />
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-display text-xl font-semibold tracking-tight">
          {{ t('seo.inventory') }}
        </h2>
        <a
          v-for="article in articles"
          :key="article.id"
          :href="article.url"
          class="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-3 text-sm text-accent transition duration-200"
          target="_blank"
        >
          <span class="min-w-0 truncate">{{ article.title }}</span>
          <Icon name="solar:arrow-right-up-linear" class="size-4 shrink-0" />
        </a>
      </UiCard>
    </div>
    <section class="space-y-3">
      <h2 class="font-display text-xl font-semibold tracking-tight">
        {{ t('chat.list') }}
      </h2>
      <ChatList module="seo" />
    </section>
  </div>
</template>
