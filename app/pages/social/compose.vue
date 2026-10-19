<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const api = useRequestFetch()
const accounts = await api<Array<{ id: string, platform: string, displayName: string }>>('/api/social/accounts')
const posts = await api<Array<{
  id: string
  body: string
  mediaAssetId: string | null
  status: string
  scheduledAt: string | null
  duplicateWarning: string | null
  targets: Array<{ accountId: string | null, platform: string, body: string, title: string | null }>
}>>('/api/social/posts')

const existing = posts.find(post => post.id === route.query.post)
const selected = ref<string[]>(existing?.targets.map(target => target.accountId).filter((id): id is string => Boolean(id)) || [])
const body = ref(existing?.body || '')
const titles = reactive<Record<string, string>>({})
const bodies = reactive<Record<string, string>>({})
for (const account of accounts) {
  const target = existing?.targets.find(item => item.accountId === account.id)
  titles[account.id] = target?.title || ''
  bodies[account.id] = target?.body || existing?.body || ''
}
const scheduledAt = ref(existing?.scheduledAt ? existing.scheduledAt.slice(0, 16) : '')
const mediaId = ref(existing?.mediaAssetId || '')
const prompt = ref('')
const warning = ref(existing?.duplicateWarning || '')
const editing = ref(false)
const error = ref('')
const busy = ref(false)

function payload(status: 'draft' | 'scheduled') {
  return {
    body: body.value,
    mediaAssetId: mediaId.value || null,
    status,
    scheduledAt: scheduledAt.value ? new Date(scheduledAt.value).toISOString() : null,
    targets: selected.value.map(accountId => ({
      accountId,
      body: bodies[accountId] || body.value,
      title: titles[accountId] || undefined,
    })),
  }
}

async function save(status: 'draft' | 'scheduled') {
  if (!selected.value.length) {
    error.value = t('social.platforms')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const path = existing ? `/api/social/posts/${existing.id}` : '/api/social/posts'
    const result = await api<{ duplicateWarning: string | null }>(path, {
      method: existing ? 'PUT' : 'POST',
      body: payload(status),
    })
    warning.value = result.duplicateWarning || ''
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function generate() {
  busy.value = true
  error.value = ''
  try {
    const result = await api<{ id: string }>('/api/media/generate', { method: 'POST', body: { prompt: prompt.value } })
    mediaId.value = result.id
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const form = new FormData()
  form.set('file', file)
  const result = await api<{ id: string }>('/api/media/upload', { method: 'POST', body: form })
  mediaId.value = result.id
}

async function retry() {
  if (!existing) return
  await api(`/api/social/posts/${existing.id}/retry`, { method: 'POST' })
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <AppBack to="/social" />
    <form class="space-y-5" @submit.prevent="save('draft')">
    <h1 class="font-serif text-5xl">
      {{ t('social.compose') }}
    </h1>
    <p class="text-sm text-stone-500">
      {{ t('social.videoHint') }}
    </p>
    <UiField :label="t('social.body')">
      <UiTextarea v-model="body" />
    </UiField>
    <div class="space-y-3">
      <p class="text-sm font-medium">
        {{ t('social.platforms') }}
      </p>
      <label v-for="account in accounts" :key="account.id" class="block rounded-3xl border border-line bg-white p-4">
        <span class="flex items-center gap-2 text-sm">
          <input v-model="selected" type="checkbox" :value="account.id">
          {{ account.displayName }} · {{ account.platform }}
        </span>
        <UiInput
          v-if="account.platform === 'youtube' || account.platform === 'tiktok'"
          :model-value="titles[account.id] || ''"
          class="mt-3"
          :placeholder="t('social.titleField')"
          @update:model-value="titles[account.id] = $event"
        />
        <UiTextarea
          :model-value="bodies[account.id] || ''"
          class="mt-3"
          :rows="3"
          @update:model-value="bodies[account.id] = $event"
        />
      </label>
    </div>
    <UiField :label="t('social.generate')">
      <div class="flex gap-2">
        <UiInput v-model="prompt" />
        <UiButton type="button" variant="ghost" :disabled="busy" @click="generate">
          {{ t('social.generate') }}
        </UiButton>
      </div>
    </UiField>
    <UiField :label="t('social.upload')">
      <input type="file" accept="image/*,video/*" @change="upload">
    </UiField>
    <img v-if="mediaId" :src="`/api/media/${mediaId}`" alt="" class="max-h-80 rounded-3xl object-cover">
    <UiButton v-if="mediaId" type="button" variant="ghost" @click="editing = !editing">
      {{ t('social.edit') }}
    </UiButton>
    <ImageEditor v-if="editing && mediaId" :src="`/api/media/${mediaId}`" @saved="mediaId = $event; editing = false" />
    <UiField :label="t('social.schedule')">
      <UiInput v-model="scheduledAt" type="datetime-local" />
    </UiField>
    <p v-if="warning" class="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {{ t('social.duplicate') }}: {{ warning }}
    </p>
    <UiAlert :message="error" />
    <div class="flex flex-wrap gap-2">
      <UiButton type="submit" :disabled="busy">
        {{ t('social.saveDraft') }}
      </UiButton>
      <UiButton type="button" variant="ghost" :disabled="busy" @click="save('scheduled')">
        {{ t('social.schedule') }}
      </UiButton>
      <UiButton v-if="existing" type="button" variant="ghost" @click="retry">
        {{ t('social.retry') }}
      </UiButton>
    </div>
    </form>
  </div>
</template>
