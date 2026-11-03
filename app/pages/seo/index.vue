<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const drafts = await api<Array<{ id: string, title: string }>>('/api/seo/drafts')
const articles = await api<Array<{ id: string, title: string, url: string }>>('/api/seo/articles')
const tab = ref('drafts')
const tabs = computed(() => [
  { id: 'drafts', label: t('seo.drafts') },
  { id: 'inventory', label: t('seo.inventory') },
  { id: 'chats', label: t('chat.list') },
])
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('seo.title')" :lead="t('seo.lead')">
      <template #actions>
        <UiButton variant="ghost" :to="localePath('/seo/settings')">
          {{ t('seo.settings') }}
        </UiButton>
        <UiButton :to="localePath('/seo/chat/new')">
          {{ t('seo.newChat') }}
        </UiButton>
      </template>
    </AppPageHead>

    <div class="grid gap-3 sm:grid-cols-2">
      <UiCard tone="highlight" class="flex items-end justify-between">
        <div>
          <p class="text-sm opacity-80">{{ t('seo.drafts') }}</p>
          <p class="mt-1 font-display text-4xl font-semibold tracking-tight">{{ drafts.length }}</p>
        </div>
        <Icon name="solar:document-text-bold-duotone" class="size-8" />
      </UiCard>
      <UiCard tone="ink" class="flex items-end justify-between">
        <div>
          <p class="text-sm opacity-80">{{ t('seo.inventory') }}</p>
          <p class="mt-1 font-display text-4xl font-semibold tracking-tight">{{ articles.length }}</p>
        </div>
        <Icon name="solar:library-bold-duotone" class="size-8" />
      </UiCard>
    </div>

    <UiTabs v-model="tab" :items="tabs" :label="t('seo.title')" />

    <div v-if="tab === 'drafts'">
      <p v-if="!drafts.length" class="text-sm text-muted">
        {{ t('seo.empty') }}
      </p>
      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="(draft, index) in drafts"
          :key="draft.id"
          :to="localePath(`/seo/articles/${draft.id}`)"
          class="flex min-h-36 flex-col justify-between rounded-[1.5rem] border border-line bg-surface p-5 transition duration-200 hover:-translate-y-0.5"
          :class="index === 0 ? 'bg-soft sm:col-span-2' : ''"
        >
          <Icon name="solar:document-bold-duotone" class="size-6 text-accent" />
          <span class="mt-4 font-display text-xl font-semibold tracking-tight">{{ draft.title }}</span>
        </NuxtLink>
      </div>
    </div>

    <div v-else-if="tab === 'inventory'" class="grid gap-3 sm:grid-cols-2">
      <a
        v-for="article in articles"
        :key="article.id"
        :href="article.url"
        class="flex items-center justify-between gap-3 rounded-[1.4rem] border border-line bg-surface px-4 py-4 text-sm transition duration-200 hover:-translate-y-0.5"
        target="_blank"
      >
        <span class="min-w-0 truncate font-medium">{{ article.title }}</span>
        <Icon name="solar:arrow-right-up-linear" class="size-4 shrink-0 text-accent" />
      </a>
      <p v-if="!articles.length" class="text-sm text-muted sm:col-span-2">
        {{ t('seo.empty') }}
      </p>
    </div>

    <ChatList v-else module="seo" tiles />
  </div>
</template>
