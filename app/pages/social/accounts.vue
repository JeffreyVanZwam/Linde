<script setup lang="ts">
type SocialAccount = { id: string, platform: string, displayName: string, authorType: string | null }
type LinkedInOption = { externalId: string, displayName: string, authorType: 'person' | 'organization', platform?: string }
type SocialApp = {
  provider: 'linkedin' | 'meta' | 'youtube' | 'tiktok'
  clientId: string
  configured: boolean
  privacy: 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'PUBLIC_TO_EVERYONE'
  redirectUri: string
}

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const api = useRequestFetch()
const accounts = ref(await api<SocialAccount[]>('/api/social/accounts'))
const apps = ref<SocialApp[]>([])
const drafts = reactive<Record<string, { clientId: string, clientSecret: string, privacy: SocialApp['privacy'] }>>({})
const editorOpen = ref<Record<string, boolean>>({})
const saving = ref('')
const notice = ref('')
const error = ref(typeof route.query.error === 'string' ? route.query.error : '')
const pendingId = typeof route.query.pending === 'string' ? route.query.pending : ''
const picker = ref<LinkedInOption[] | null>(null)
const choosing = ref(false)

const labels: Record<SocialApp['provider'], string> = {
  linkedin: 'LinkedIn',
  meta: 'Meta',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

function draftFor(provider: string) {
  const draft = drafts[provider]
  if (!draft) throw new Error('Ontbrekend formulier')
  return draft
}

function applyApps(list: SocialApp[]) {
  apps.value = list
  for (const app of list) {
    const draft = drafts[app.provider]
    if (!draft) {
      drafts[app.provider] = { clientId: app.clientId, clientSecret: '', privacy: app.privacy }
      editorOpen.value[app.provider] = !app.configured
    }
    else {
      draft.clientId = app.clientId
      draft.clientSecret = ''
      draft.privacy = app.privacy
    }
  }
}

applyApps(await api<SocialApp[]>('/api/social/apps'))

if (pendingId) {
  try {
    const pending = await api<{ options: LinkedInOption[] }>(`/api/social/linkedin/pending/${pendingId}`)
    picker.value = pending.options
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function saveApp(provider: SocialApp['provider']) {
  const draft = drafts[provider]
  if (!draft) return
  saving.value = provider
  error.value = ''
  notice.value = ''
  try {
    const list = await api<SocialApp[]>('/api/social/apps', {
      method: 'PUT',
      body: {
        provider,
        clientId: draft.clientId,
        clientSecret: draft.clientSecret || undefined,
        privacy: provider === 'tiktok' ? draft.privacy : undefined,
      },
    })
    applyApps(list)
    editorOpen.value[provider] = false
    notice.value = t('social.appSaved')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    saving.value = ''
  }
}

function accountKind(account: { platform: string, authorType: string | null }) {
  if (account.platform === 'instagram') return 'Instagram'
  if (account.authorType === 'organization') return t('social.linkedinPage')
  if (account.authorType === 'person') return t('social.linkedinProfile')
  return ''
}

async function syncAll() {
  error.value = ''
  try {
    const result = await api<{ results: Array<{ warning: string | null }> }>('/api/social/sync', { method: 'POST', body: {} })
    notice.value = result.results.map(item => item.warning).filter(Boolean).join(' · ')
    accounts.value = await api<SocialAccount[]>('/api/social/accounts')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function chooseLinkedIn(externalId: string) {
  if (!pendingId) return
  choosing.value = true
  error.value = ''
  try {
    await api('/api/social/linkedin/choose', {
      method: 'POST',
      body: {
        pendingId,
        externalId,
        platform: picker.value?.find(option => option.externalId === externalId)?.platform,
      },
    })
    picker.value = null
    accounts.value = await api<SocialAccount[]>('/api/social/accounts')
    await navigateTo(localePath('/social/accounts'), { replace: true })
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    choosing.value = false
  }
}

async function cancelLinkedIn() {
  if (!pendingId || choosing.value) return
  choosing.value = true
  try {
    const call = api as (url: string, options?: Record<string, unknown>) => Promise<unknown>
    await call(`/api/social/linkedin/pending/${pendingId}`, { method: 'DELETE' })
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    choosing.value = false
    picker.value = null
    await navigateTo(localePath('/social/accounts'), { replace: true })
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
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('social.accounts') }}
      </h1>
      <p class="mt-3 max-w-2xl text-stone-600">
        {{ t('social.appLead') }}
      </p>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <UiCard v-for="app in apps" :key="app.provider">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium">
            {{ labels[app.provider] }}
          </p>
          <UiButton v-if="app.configured" :href="`/api/social/connect/${app.provider}?locale=${locale}`">
            {{ t('social.connect') }}
          </UiButton>
        </div>
        <p v-if="!app.configured" class="mt-2 text-sm text-stone-500">
          {{ t('social.setupApp') }}
        </p>
        <button type="button" class="mt-3 text-sm text-stone-500 underline" @click="editorOpen[app.provider] = !editorOpen[app.provider]">
          {{ t('social.editApp') }}
        </button>
        <form v-if="editorOpen[app.provider] && drafts[app.provider]" class="mt-3 space-y-3" @submit.prevent="saveApp(app.provider)">
          <UiField :label="t('social.clientId')">
            <UiInput v-model="draftFor(app.provider).clientId" required autocomplete="off" />
          </UiField>
          <UiField :label="t('social.clientSecret')">
            <UiInput v-model="draftFor(app.provider).clientSecret" type="password" autocomplete="new-password" />
          </UiField>
          <p class="text-xs text-stone-500">
            {{ t('social.clientSecretHint') }}
          </p>
          <UiField v-if="app.provider === 'tiktok'" :label="t('social.privacy')">
            <select v-model="draftFor(app.provider).privacy" class="w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2">
              <option value="SELF_ONLY">
                {{ t('social.privacySelf') }}
              </option>
              <option value="MUTUAL_FOLLOW_FRIENDS">
                {{ t('social.privacyFriends') }}
              </option>
              <option value="FOLLOWER_OF_CREATOR">
                {{ t('social.privacyFollowers') }}
              </option>
              <option value="PUBLIC_TO_EVERYONE">
                {{ t('social.privacyPublic') }}
              </option>
            </select>
          </UiField>
          <p class="text-xs text-stone-500">
            {{ t('social.redirectUri') }}
            <span class="mt-1 block break-all font-mono text-stone-700">{{ app.redirectUri }}</span>
          </p>
          <UiButton type="submit" :disabled="saving === app.provider">
            {{ t('common.save') }}
          </UiButton>
        </form>
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
        <p v-if="accountKind(account)" class="text-xs text-stone-500">
          {{ accountKind(account) }}
        </p>
      </div>
      <UiButton variant="danger" @click="remove(account.id)">
        {{ t('social.disconnect') }}
      </UiButton>
    </UiCard>
    <LinkedInAccountPicker
      v-if="picker"
      :options="picker"
      :busy="choosing"
      @select="chooseLinkedIn"
      @cancel="cancelLinkedIn"
    />
  </div>
</template>
