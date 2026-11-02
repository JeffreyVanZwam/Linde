<script setup lang="ts">
import type { ConnectProvider } from '~~/shared/platforms'
import { motion } from 'motion-v'

type Privacy = 'SELF_ONLY' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'PUBLIC_TO_EVERYONE'
type Account = { id: string, platform: string, displayName: string, authorType: string | null }

const props = defineProps<{
  provider: ConnectProvider
  label: string
  configured: boolean
  stored: boolean
  redirectUri: string
  accounts: Account[]
  busy: boolean
  locale: string
  error: string
  notice: string
}>()

const clientId = defineModel<string>('clientId', { required: true })
const clientSecret = defineModel<string>('clientSecret', { required: true })
const privacy = defineModel<Privacy>('privacy', { required: true })

const emit = defineEmits<{
  close: []
  save: []
  removeAccount: [id: string]
  removeCredentials: []
}>()

const { t } = useI18n()
const closeButton = ref<HTMLButtonElement | null>(null)
const linked = computed(() => props.accounts.length > 0)

function accountKind(account: Account) {
  if (account.platform === 'instagram') return 'Instagram'
  if (account.authorType === 'organization') return t('social.linkedinPage')
  if (account.authorType === 'person') return t('social.linkedinProfile')
  return ''
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.busy) emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  closeButton.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <motion.div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      @click.self="busy ? undefined : emit('close')"
    >
      <motion.div
        class="max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-editor-title"
        :initial="{ y: 16, opacity: 0 }"
        :animate="{ y: 0, opacity: 1 }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <PlatformMark :provider="provider" />
            <div>
              <h2 id="account-editor-title" class="font-display text-3xl font-semibold tracking-tight">
                {{ label }}
              </h2>
              <p class="mt-1 flex items-center gap-2 text-sm text-muted">
                <span class="size-2.5 rounded-full" :class="linked ? 'bg-emerald-500' : 'bg-red-500'" />
                {{ linked ? t('social.connected') : t('social.notConnected') }}
              </p>
            </div>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-soft hover:text-ink"
            :aria-label="t('social.close')"
            :disabled="busy"
            @click="emit('close')"
          >
            <Icon name="solar:close-circle-linear" class="size-6" />
          </button>
        </div>

        <div class="mt-5 space-y-2">
          <p v-if="!accounts.length" class="text-sm text-muted">
            {{ t('social.channelEmpty') }}
          </p>
          <div v-for="account in accounts" :key="account.id" class="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-3">
            <div class="min-w-0">
              <p class="truncate font-medium">
                {{ account.displayName }}
              </p>
              <p v-if="accountKind(account)" class="text-xs text-muted">
                {{ accountKind(account) }}
              </p>
              <p v-if="account.platform === 'facebook' && account.authorType === 'person'" class="mt-1 text-xs text-muted">
                {{ t('social.facebookProfilePosts') }}
              </p>
            </div>
            <UiButton variant="danger" :disabled="busy" @click="emit('removeAccount', account.id)">
              {{ t('social.disconnect') }}
            </UiButton>
          </div>
        </div>

        <form class="mt-5 space-y-3" @submit.prevent="emit('save')">
          <UiField :label="provider === 'instagram' ? t('social.instagramAppId') : t('social.clientId')">
            <UiInput v-model="clientId" required autocomplete="off" />
          </UiField>
          <UiField :label="provider === 'instagram' ? t('social.instagramAppSecret') : t('social.clientSecret')">
            <UiInput v-model="clientSecret" type="password" autocomplete="new-password" />
          </UiField>
          <p class="text-xs text-muted">
            {{ t('social.clientSecretHint') }}
          </p>
          <UiField v-if="provider === 'tiktok'" :label="t('social.privacy')">
            <select v-model="privacy" class="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-contrast focus:ring-2 focus:ring-contrast">
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
          <p v-if="provider === 'facebook'" class="text-sm text-muted">
            {{ t('social.facebookConnectHint') }}
          </p>
          <p v-if="provider === 'instagram'" class="text-sm text-muted">
            {{ t('social.instagramConnectHint') }}
          </p>
          <p v-if="!configured" class="text-sm text-muted">
            {{ t('social.setupApp') }}
          </p>
          <p class="text-xs text-muted">
            {{ t('social.redirectUri') }}
            <span class="mt-1 block break-all font-mono text-ink">{{ redirectUri }}</span>
          </p>
          <p v-if="notice && !error" class="text-sm text-muted">
            {{ notice }}
          </p>
          <UiAlert :message="error" />
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <UiButton v-if="stored" variant="danger" :disabled="busy" @click="emit('removeCredentials')">
              {{ t('social.removeCredentials') }}
            </UiButton>
            <span v-else />
            <div class="flex flex-wrap gap-2">
              <UiButton v-if="configured && !busy" variant="ghost" :href="`/api/social/connect/${provider}?locale=${locale}`">
                {{ t('social.connect') }}
              </UiButton>
              <UiButton type="submit" :disabled="busy">
                {{ t('common.save') }}
              </UiButton>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  </Teleport>
</template>
