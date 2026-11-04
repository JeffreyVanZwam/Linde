<script setup lang="ts">
type Item = { id: string, position: number, postId: string, status: string, scheduledAt: string | null }
type Series = { id: string, title: string, status: string, cadenceDays: number, items: Item[] }

const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const title = ref('')
const prompt = ref('')
const cadenceDays = ref(1)
const lengthDays = ref(5)
const error = ref('')
const busy = ref(false)
const rows = ref<Series[]>([])

async function load() {
  rows.value = await api<Series[]>('/api/social/series').catch(() => [])
}
await load()

async function create() {
  busy.value = true
  error.value = ''
  try {
    await api('/api/social/series', {
      method: 'POST',
      body: { title: title.value, prompt: prompt.value, cadenceDays: Number(cadenceDays.value), lengthDays: Number(lengthDays.value) },
    })
    title.value = ''
    prompt.value = ''
    await load()
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function approve(id: string) {
  await api(`/api/social/series/${id}`, { method: 'POST' })
  await load()
}
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('forge.series')" :lead="t('forge.seriesLead')" />
    <UiCard>
      <form class="space-y-3" @submit.prevent="create">
        <UiInput v-model="title" :placeholder="t('brands.name')" />
        <UiTextarea v-model="prompt" :rows="4" />
        <div class="grid gap-3 sm:grid-cols-2">
          <UiField :label="t('forge.cadence')">
            <UiInput v-model="cadenceDays" type="number" />
          </UiField>
          <UiField :label="t('forge.length')">
            <UiInput v-model="lengthDays" type="number" />
          </UiField>
        </div>
        <UiButton type="submit" :disabled="busy || !title.trim() || !prompt.trim()">{{ t('forge.make') }}</UiButton>
      </form>
    </UiCard>
    <UiCard v-for="series in rows" :key="series.id">
      <h2 class="font-display text-2xl font-semibold">{{ series.title }}</h2>
      <div v-for="item in series.items" :key="item.id" class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <NuxtLink class="text-sm" :to="localePath(`/social/compose?post=${item.postId}`)">{{ item.position + 1 }} · {{ item.status }}</NuxtLink>
        <UiButton v-if="item.status !== 'approved'" type="button" variant="ghost" @click="approve(item.id)">{{ t('forge.approve') }}</UiButton>
      </div>
    </UiCard>
    <UiAlert :message="error" />
  </div>
</template>
