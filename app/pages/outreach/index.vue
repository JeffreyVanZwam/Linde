<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const campaigns = await api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns')
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-5xl">
          {{ t('outreach.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-stone-600">
          {{ t('outreach.lead') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="ghost" :to="localePath('/outreach/settings')">{{ t('outreach.settings') }}</UiButton>
        <UiButton :to="localePath('/outreach/chat/new')">{{ t('outreach.newChat') }}</UiButton>
      </div>
    </div>
    <p v-if="!campaigns.length" class="text-sm text-stone-500">
      {{ t('outreach.empty') }}
    </p>
    <NuxtLink v-for="campaign in campaigns" :key="campaign.id" :to="localePath(`/outreach/${campaign.id}`)" class="block rounded-3xl border border-line bg-white px-5 py-4">
      {{ campaign.name }} · {{ campaign.status }}
    </NuxtLink>
  </div>
</template>
