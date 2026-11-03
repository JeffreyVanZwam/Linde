<script setup lang="ts">
import type { ConnectProvider } from '~~/shared/platforms'

type SocialAccount = { id: string, platform: string, displayName: string, authorType: string | null }
type LinkedInOption = { externalId: string, displayName: string, authorType: 'person' | 'organization', platform?: string }
type SocialApp = {
  provider: ConnectProvider
  clientId: string
  configured: boolean
  stored: boolean
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
const saving = ref('')
const notice = ref('')
const error = ref(typeof route.query.error === 'string' ? route.query.error : '')
const pendingId = typeof route.query.pending === 'string' ? route.query.pending : ''
const picker = ref<LinkedInOption[] | null>(null)
const choosing = ref(false)
const active = ref<ConnectProvider | null>(null)

const labels: Record<ConnectProvider, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

function applyApps(list: SocialApp[]) {
  apps.value = list
  for (const app of list) {
    const draft = drafts[app.provider]
    if (!draft) drafts[app.provider] = { clientId: app.clientId, clientSecret: '', privacy: app.privacy }
    else {
      draft.clientId = app.clientId
      draft.clientSecret = ''
      draft.privacy = app.privacy
    }
  }
}

applyApps(await api<SocialApp[]>('/api/social/apps'))

const linkedCount = computed(() => apps.value.filter(app => linked(app.provider)).length)
const activeApp = computed(() => apps.value.find(app => app.provider === active.value) || null)
const activeDraft = computed(() => (active.value ? drafts[active.value] : undefined))
const activeAccounts = computed(() => accounts.value.filter(account => account.platform === active.value))

function linked(provider: string) {
  return accounts.value.some(account => account.platform === provider)
}

function openChannel(provider: ConnectProvider) {
  notice.value = ''
  active.value = provider
}

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
    notice.value = t('social.appSaved')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    saving.value = ''
  }
}

async function syncAll() {
  error.value = ''
  notice.value = ''
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
  saving.value = id
  error.value = ''
  notice.value = ''
  try {
    const call = api as (url: string, options?: Record<string, unknown>) => Promise<unknown>
    await call(`/api/social/accounts/${id}`, { method: 'DELETE' })
    accounts.value = accounts.value.filter(account => account.id !== id)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    saving.value = ''
  }
}

async function removeApp(provider: ConnectProvider) {
  saving.value = provider
  error.value = ''
  notice.value = ''
  try {
    const call = api as (url: string, options?: Record<string, unknown>) => Promise<SocialApp[]>
    const list = await call(`/api/social/apps/${provider}`, { method: 'DELETE' })
    applyApps(list)
    notice.value = t('social.credentialsRemoved')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    saving.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <AppBack to="/social" />
    <AppPageHead :title="t('social.accounts')" :lead="t('social.appLead')">
      <template #actions>
        <UiButton variant="ghost" @click="syncAll">
          {{ t('social.sync') }}
        </UiButton>
      </template>
    </AppPageHead>
    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard tone="highlight">
        <p class="text-sm opacity-80">{{ t('social.connected') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ linkedCount }}</p>
      </UiCard>
      <UiCard>
        <p class="text-sm text-muted">{{ t('social.notConnected') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ Math.max(0, apps.length - linkedCount) }}</p>
      </UiCard>
      <UiCard tone="ink" class="flex flex-col justify-end">
        <p class="font-display text-2xl font-semibold tracking-tight">{{ t('social.platforms') }}</p>
      </UiCard>
    </div>
    <UiAlert v-if="!activeApp" :message="error || notice" />
    <section class="rounded-[1.75rem] border border-line bg-soft/70 p-3 sm:p-5" :aria-label="t('social.accounts')">
      <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-muted">
        <span class="inline-flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-emerald-500" />
          {{ t('social.connected') }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-red-500" />
          {{ t('social.notConnected') }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          v-for="app in apps"
          :key="app.provider"
          type="button"
          class="relative flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-3 py-4 text-center shadow-[0_16px_36px_-28px_rgba(0,0,0,0.65)] transition duration-200 hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
          :aria-haspopup="'dialog'"
          :aria-label="`${labels[app.provider]}, ${linked(app.provider) ? t('social.connected') : t('social.notConnected')}`"
          @click="openChannel(app.provider)"
        >
          <span
            class="absolute right-2.5 top-2.5 size-3 rounded-full ring-2 ring-surface"
            :class="linked(app.provider) ? 'bg-emerald-500' : 'bg-red-500'"
          />
          <PlatformMark :provider="app.provider" />
          <span class="text-xs font-medium leading-tight">{{ labels[app.provider] }}</span>
        </button>
      </div>
    </section>
    <template v-if="activeApp && activeDraft">
      <SocialAccountModal
        v-model:client-id="activeDraft.clientId"
        v-model:client-secret="activeDraft.clientSecret"
        v-model:privacy="activeDraft.privacy"
        :provider="activeApp.provider"
        :label="labels[activeApp.provider]"
        :configured="activeApp.configured"
        :stored="activeApp.stored"
        :redirect-uri="activeApp.redirectUri"
        :accounts="activeAccounts"
        :busy="saving !== ''"
        :locale="locale"
        :error="error"
        :notice="notice"
        @close="active = null"
        @save="saveApp(activeApp.provider)"
        @remove-account="remove"
        @remove-credentials="removeApp(activeApp.provider)"
      />
    </template>
    <LinkedInAccountPicker
      v-if="picker"
      :options="picker"
      :busy="choosing"
      @select="chooseLinkedIn"
      @cancel="cancelLinkedIn"
    />
  </div>
</template>
