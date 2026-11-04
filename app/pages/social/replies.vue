<script setup lang="ts">
const { t } = useI18n()
const api = useRequestFetch()
const text = ref('')
const replies = ref<string[]>([])
const error = ref('')
const busy = ref(false)
const copied = ref('')

async function run() {
  busy.value = true
  error.value = ''
  try {
    const result = await api<{ replies: string[] }>('/api/social/replies', { method: 'POST', body: { text: text.value } })
    replies.value = result.replies
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function copy(reply: string) {
  await navigator.clipboard.writeText(reply)
  copied.value = reply
}
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('forge.replies')" :lead="t('forge.repliesLead')" />
    <UiCard>
      <form class="space-y-3" @submit.prevent="run">
        <UiTextarea v-model="text" :rows="6" />
        <UiButton type="submit" :disabled="busy || !text.trim()">{{ t('forge.run') }}</UiButton>
      </form>
    </UiCard>
    <UiCard v-for="reply in replies" :key="reply">
      <p class="whitespace-pre-wrap text-sm">{{ reply }}</p>
      <UiButton class="mt-3" type="button" variant="ghost" @click="copy(reply)">
        {{ copied === reply ? t('common.save') : t('forge.copy') }}
      </UiButton>
    </UiCard>
    <UiAlert :message="error" />
  </div>
</template>
