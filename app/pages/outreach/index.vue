<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const campaigns = await api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns')
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-5xl font-semibold tracking-tight">
          {{ t('outreach.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-muted">
          {{ t('outreach.lead') }}
        </p>
      </div>
      <UiButton :to="localePath('/outreach/chat/new')">
        {{ t('outreach.newChat') }}
      </UiButton>
    </div>
    <p v-if="!campaigns.length" class="text-sm text-muted">
      {{ t('outreach.empty') }}
    </p>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <NuxtLink
        v-for="campaign in campaigns"
        :key="campaign.id"
        :to="localePath(`/outreach/${campaign.id}`)"
        class="flex items-center justify-between gap-3 rounded-[1.4rem] border border-line bg-surface px-5 py-4 transition duration-200 hover:-translate-y-0.5"
      >
        <span class="min-w-0 truncate font-medium">{{ campaign.name }}</span>
        <span class="shrink-0 rounded-full bg-contrast px-2.5 py-1 text-[11px] font-semibold text-contrast-ink">{{ campaign.status }}</span>
      </NuxtLink>
    </div>
    <section class="space-y-3">
      <h2 class="font-display text-xl font-semibold tracking-tight">
        {{ t('chat.list') }}
      </h2>
      <ChatList module="outreach" />
    </section>
  </div>
</template>
