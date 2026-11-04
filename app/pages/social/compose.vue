<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const api = useRequestFetch()
const accounts = await api<Array<{ id: string, platform: string, displayName: string, authorType: string | null }>>('/api/social/accounts')
const posts = await api<Array<{
  id: string
  body: string
  mediaAssetId: string | null
  status: string
  scheduledAt: string | null
  duplicateWarning: string | null
  targets: Array<{ accountId: string | null, platform: string, body: string, title: string | null, duplicateWarning: string | null }>
}>>('/api/social/posts')

const existing = posts.find(post => post.id === route.query.post)
const selected = ref<string[]>(existing?.targets.map(target => target.accountId).filter((id): id is string => Boolean(id)) || [])
const body = ref(existing?.body || '')
const titles = reactive<Record<string, string>>({})
const bodies = reactive<Record<string, string>>({})
const targetWarnings = reactive<Record<string, string>>({})
const blocked = ref<string[]>([])
for (const account of accounts) {
  const target = existing?.targets.find(item => item.accountId === account.id)
  titles[account.id] = target?.title || ''
  bodies[account.id] = target?.body || existing?.body || ''
  if (target?.duplicateWarning) targetWarnings[account.id] = target.duplicateWarning
}
const scheduledAt = ref(existing?.scheduledAt ? existing.scheduledAt.slice(0, 16) : '')
const mediaId = ref(existing?.mediaAssetId || '')
const prompt = ref('')
const editing = ref(false)

function accountLabel(account: { displayName: string, platform: string, authorType: string | null }) {
  if (account.platform === 'instagram') return `${account.displayName} · Instagram`
  if (account.authorType === 'organization') return `${account.displayName} · ${t('social.linkedinPage')}`
  if (account.authorType === 'person') return `${account.displayName} · ${t('social.linkedinProfile')}`
  return `${account.displayName} · ${account.platform}`
}
const error = ref('')
const busy = ref(false)
const ruleOffer = ref('')

const chips = [
  { id: 'shorter', label: 'forge.shorter' },
  { id: 'hook', label: 'forge.hook' },
  { id: 'casual', label: 'forge.casual' },
  { id: 'sell', label: 'forge.sell' },
] as const

async function improve(instruction: string, accountId?: string) {
  const source = accountId ? bodies[accountId] || body.value : body.value
  if (!source.trim()) return
  busy.value = true
  error.value = ''
  try {
    const result = await api<{ text: string }>('/api/social/improve', { method: 'POST', body: { body: source, instruction } })
    if (accountId) bodies[accountId] = result.text
    else {
      body.value = result.text
      for (const id of selected.value) bodies[id] = result.text
    }
    ruleOffer.value = instruction
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function keepRule() {
  if (!ruleOffer.value) return
  const labels: Record<string, string> = {
    shorter: t('forge.shorter'),
    hook: t('forge.hook'),
    casual: t('forge.casual'),
    sell: t('forge.sell'),
  }
  await api('/api/brands/rules', { method: 'POST', body: { text: labels[ruleOffer.value] || ruleOffer.value } })
  ruleOffer.value = ''
}

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
    const result = await api<{
      duplicateWarning: string | null
      targets: Array<{ accountId: string, status: string, duplicateWarning: string | null }>
    }>(path, {
      method: existing ? 'PUT' : 'POST',
      body: payload(status),
    })
    blocked.value = []
    for (const accountId of selected.value) delete targetWarnings[accountId]
    for (const target of result.targets) {
      if (target.duplicateWarning) targetWarnings[target.accountId] = target.duplicateWarning
      if (status === 'scheduled' && target.status === 'draft') blocked.value.push(target.accountId)
    }
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
  <div class="space-y-5">
    <AppBack to="/social" />
    <AppPageHead :title="t('social.compose')" :lead="t('social.videoHint')" />
    <form id="compose" class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]" @submit.prevent="save('draft')">
      <div class="space-y-4">
        <UiCard>
          <UiField :label="t('social.body')">
            <UiTextarea v-model="body" />
          </UiField>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton v-for="chip in chips" :key="chip.id" type="button" variant="ghost" :disabled="busy" @click="improve(chip.id)">
              {{ t(chip.label) }}
            </UiButton>
          </div>
          <p v-if="ruleOffer" class="mt-3 text-sm">
            {{ t('forge.ruleOffer') }}
            <button type="button" class="ml-2 font-medium text-accent" @click="keepRule">{{ t('forge.ruleSave') }}</button>
          </p>
        </UiCard>
        <div class="grid gap-3 md:grid-cols-2">
          <label v-for="account in accounts" :key="account.id" class="block rounded-[1.4rem] border border-line bg-surface p-4">
            <span class="flex items-center gap-2 text-sm font-medium">
              <input v-model="selected" type="checkbox" :value="account.id">
              {{ accountLabel(account) }}
            </span>
            <UiInput
              v-if="account.platform === 'youtube' || account.platform === 'tiktok' || account.platform === 'pinterest'"
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
            <p v-if="targetWarnings[account.id]" class="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {{ t('social.duplicate') }}: {{ targetWarnings[account.id] }}
              <span v-if="blocked.includes(account.id)"> {{ t('social.notScheduled') }}</span>
            </p>
          </label>
        </div>
      </div>
      <div class="space-y-4 lg:sticky lg:top-0">
        <UiCard>
          <UiField :label="t('social.generate')">
            <div class="flex gap-2">
              <UiInput v-model="prompt" />
              <UiButton type="button" variant="ghost" :disabled="busy" @click="generate">
                {{ t('social.generate') }}
              </UiButton>
            </div>
          </UiField>
          <UiField class="mt-4" :label="t('social.upload')">
            <input type="file" accept="image/*,video/*" @change="upload">
          </UiField>
          <img v-if="mediaId" :src="`/api/media/${mediaId}`" alt="" class="mt-4 max-h-64 w-full rounded-2xl object-cover">
          <UiButton v-if="mediaId" class="mt-3" type="button" variant="ghost" @click="editing = !editing">
            {{ t('social.edit') }}
          </UiButton>
          <ImageEditor v-if="editing && mediaId" class="mt-3" :src="`/api/media/${mediaId}`" @saved="mediaId = $event; editing = false" />
        </UiCard>
        <UiCard tone="soft">
          <UiField :label="t('social.schedule')">
            <UiInput v-model="scheduledAt" type="datetime-local" />
          </UiField>
          <div class="mt-4 flex flex-wrap gap-2">
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
        </UiCard>
        <UiAlert :message="error" />
      </div>
    </form>
  </div>
</template>
