<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const author = ref('')
const quote = ref('')
const source = ref('')
const error = ref('')
const busy = ref(false)
const rows = ref(await api<Array<{ id: string, author: string, quote: string, postId: string }>>('/api/social/proof').catch(() => []))

async function save() {
  busy.value = true
  error.value = ''
  try {
    const result = await api<{ postId: string }>('/api/social/proof', {
      method: 'POST',
      body: { author: author.value, quote: quote.value, source: source.value },
    })
    await navigateTo(localePath(`/social/compose?post=${result.postId}`))
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('forge.proof')" :lead="t('forge.proofLead')" />
    <UiCard>
      <form class="space-y-3" @submit.prevent="save">
        <UiInput v-model="author" :placeholder="t('forge.author')" />
        <UiTextarea v-model="quote" :rows="5" :placeholder="t('forge.quote')" />
        <UiInput v-model="source" :placeholder="t('forge.source')" />
        <UiButton type="submit" :disabled="busy || !quote.trim()">{{ t('forge.make') }}</UiButton>
      </form>
    </UiCard>
    <UiCard v-for="row in rows" :key="row.id">
      <p class="text-sm text-muted">{{ row.author }}</p>
      <p class="mt-2 text-sm">{{ row.quote }}</p>
      <NuxtLink v-if="row.postId" class="mt-3 inline-block text-sm text-accent" :to="localePath(`/social/compose?post=${row.postId}`)">{{ t('social.compose') }}</NuxtLink>
    </UiCard>
    <UiAlert :message="error" />
  </div>
</template>
