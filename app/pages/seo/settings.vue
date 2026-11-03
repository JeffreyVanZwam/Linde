<script setup lang="ts">
const { t } = useI18n()
const api = useRequestFetch()
const me = await api<{ brand: { articlesUrl: string | null } | null }>('/api/me')
const url = ref(me.brand?.articlesUrl || '')
const error = ref('')
const message = ref('')

async function save() {
  error.value = ''
  try {
    await api('/api/brain', { method: 'PUT', body: { articlesUrl: url.value } })
    message.value = t('common.save')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function refresh() {
  error.value = ''
  try {
    await save()
    const result = await api<{ count: number }>('/api/seo/refresh', { method: 'POST' })
    message.value = String(result.count)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}
</script>

<template>
  <div class="space-y-5">
    <AppBack to="/seo" />
    <AppPageHead :title="t('seo.settings')" :lead="t('seo.lead')" />
    <form class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]" @submit.prevent="save">
      <UiCard class="space-y-4">
        <UiField :label="t('seo.url')">
          <UiInput v-model="url" type="url" required />
        </UiField>
        <UiAlert :message="error" />
        <p v-if="message" class="text-sm text-accent">
          {{ message }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UiButton type="submit">
            {{ t('seo.saveUrl') }}
          </UiButton>
          <UiButton type="button" variant="ghost" @click="refresh">
            {{ t('seo.refresh') }}
          </UiButton>
        </div>
      </UiCard>
      <UiCard tone="ink" class="flex min-h-48 flex-col justify-between">
        <Icon name="solar:globus-bold-duotone" class="size-8" />
        <p class="font-display text-2xl font-semibold tracking-tight">
          {{ t('seo.inventory') }}
        </p>
      </UiCard>
    </form>
  </div>
</template>
