<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const problem = ref('')
const kind = ref<'checklist' | 'guide'>('checklist')
const error = ref('')
const busy = ref(false)
const rows = ref(await api<Array<{ id: string, title: string, kind: string, fileId: string, postId: string }>>('/api/social/magnets').catch(() => []))

async function make() {
  busy.value = true
  error.value = ''
  try {
    await api('/api/social/magnets', { method: 'POST', body: { problem: problem.value, kind: kind.value } })
    rows.value = await api('/api/social/magnets')
    problem.value = ''
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('forge.magnets')" :lead="t('forge.magnetsLead')" />
    <UiCard>
      <form class="space-y-3" @submit.prevent="make">
        <UiTextarea v-model="problem" :rows="4" :placeholder="t('forge.problem')" />
        <div class="flex gap-2">
          <button type="button" class="rounded-full px-3 py-1 text-sm" :class="kind === 'checklist' ? 'bg-cta text-cta-ink' : 'bg-soft'" @click="kind = 'checklist'">{{ t('forge.checklist') }}</button>
          <button type="button" class="rounded-full px-3 py-1 text-sm" :class="kind === 'guide' ? 'bg-cta text-cta-ink' : 'bg-soft'" @click="kind = 'guide'">{{ t('forge.guide') }}</button>
        </div>
        <UiButton type="submit" :disabled="busy || !problem.trim()">{{ t('forge.make') }}</UiButton>
      </form>
    </UiCard>
    <UiCard v-for="row in rows" :key="row.id">
      <p class="font-medium">{{ row.title }}</p>
      <p class="text-sm text-muted">{{ row.kind }}</p>
      <div class="mt-3 flex gap-3 text-sm">
        <a v-if="row.fileId" class="text-accent" :href="`/api/media/${row.fileId}`">PDF</a>
        <NuxtLink v-if="row.postId" class="text-accent" :to="localePath(`/social/compose?post=${row.postId}`)">{{ t('social.compose') }}</NuxtLink>
      </div>
    </UiCard>
    <UiAlert :message="error" />
  </div>
</template>
