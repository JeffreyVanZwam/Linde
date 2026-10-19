<script setup lang="ts">
const { t, locale } = useI18n()
const api = useRequestFetch()
const providers = await api<{ social: Record<string, boolean> }>('/api/settings/providers')
const accounts = ref(await api<Array<{ id: string, platform: string, displayName: string }>>('/api/social/accounts'))
const notice = ref('')
const error = ref('')

const links = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'meta', label: 'Meta' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
]

async function syncAll() {
  error.value = ''
  try {
    const result = await api<{ results: Array<{ warning: string | null }> }>('/api/social/sync', { method: 'POST', body: {} })
    notice.value = result.results.map(item => item.warning).filter(Boolean).join(' · ')
    accounts.value = await api<Array<{ id: string, platform: string, displayName: string }>>('/api/social/accounts')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function remove(id: string) {
  const call = api as (url: string, options?: Record<string, unknown>) => Promise<unknown>
  await call(`/api/social/accounts/${id}`, { method: 'DELETE' })
  accounts.value = accounts.value.filter(account => account.id !== id)
}
</script>

<template>
  <div class="space-y-6">
    <AppBack to="/social" />
    <h1 class="font-serif text-5xl">
      {{ t('social.accounts') }}
    </h1>
    <div class="grid gap-3 md:grid-cols-2">
      <UiCard v-for="link in links" :key="link.id">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium">
            {{ link.label }}
          </p>
          <UiButton v-if="providers.social[link.id]" :href="`/api/social/connect/${link.id}?locale=${locale}`">
            {{ t('social.connect') }}
          </UiButton>
          <span v-else class="text-xs text-stone-500">{{ t('social.missingKeys') }}</span>
        </div>
      </UiCard>
    </div>
    <div class="flex gap-2">
      <UiButton variant="ghost" @click="syncAll">
        {{ t('social.sync') }}
      </UiButton>
    </div>
    <UiAlert :message="error || notice" />
    <p v-if="!accounts.length" class="text-sm text-stone-500">
      {{ t('social.emptyAccounts') }}
    </p>
    <UiCard v-for="account in accounts" :key="account.id" class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-wide text-stone-400">
          {{ account.platform }}
        </p>
        <p>{{ account.displayName }}</p>
      </div>
      <UiButton variant="danger" @click="remove(account.id)">
        {{ t('social.disconnect') }}
      </UiButton>
    </UiCard>
  </div>
</template>
