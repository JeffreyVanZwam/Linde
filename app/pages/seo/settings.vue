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
  <div class="mx-auto max-w-2xl space-y-4">
    <AppBack to="/seo" />
    <form class="space-y-4" @submit.prevent="save">
    <h1 class="font-serif text-5xl">
      {{ t('seo.settings') }}
    </h1>
    <UiField :label="t('seo.url')">
      <UiInput v-model="url" type="url" required />
    </UiField>
    <UiAlert :message="error" />
    <p v-if="message" class="text-sm text-accent">
      {{ message }}
    </p>
    <div class="flex gap-2">
      <UiButton type="submit">
        {{ t('seo.saveUrl') }}
      </UiButton>
      <UiButton type="button" variant="ghost" @click="refresh">
        {{ t('seo.refresh') }}
      </UiButton>
    </div>
    </form>
  </div>
</template>
