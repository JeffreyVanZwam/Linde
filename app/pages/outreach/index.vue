<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const campaigns = await api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns')
const tab = ref('campaigns')
const tabs = computed(() => [
  { id: 'campaigns', label: t('home.campaigns') },
  { id: 'chats', label: t('chat.list') },
])
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('outreach.title')" :lead="t('outreach.lead')">
      <template #actions>
        <UiButton variant="ghost" :to="localePath('/outreach/settings')">
          {{ t('outreach.settings') }}
        </UiButton>
        <UiButton :to="localePath('/outreach/chat/new')">
          {{ t('outreach.newChat') }}
        </UiButton>
      </template>
    </AppPageHead>

    <UiTabs v-model="tab" :items="tabs" :label="t('outreach.title')" />

    <div v-if="tab === 'campaigns'">
      <p v-if="!campaigns.length" class="rounded-[1.6rem] border border-dashed border-line px-5 py-10 text-sm text-muted">
        {{ t('outreach.empty') }}
      </p>
      <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="(campaign, index) in campaigns"
          :key="campaign.id"
          :to="localePath(`/outreach/${campaign.id}`)"
          class="flex min-h-36 flex-col justify-between rounded-[1.5rem] p-5 transition duration-200 hover:-translate-y-0.5"
          :class="index === 0
            ? 'bg-cta text-cta-ink md:col-span-2 xl:col-span-2'
            : 'border border-line bg-surface'"
        >
          <span class="self-start rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="index === 0 ? 'bg-surface/30' : 'bg-cta text-cta-ink'">
            {{ campaign.status }}
          </span>
          <span class="mt-4 font-display text-2xl font-semibold tracking-tight">{{ campaign.name }}</span>
        </NuxtLink>
      </div>
    </div>
    <ChatList v-else module="outreach" tiles />
  </div>
</template>
