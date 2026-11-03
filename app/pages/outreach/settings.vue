<script setup lang="ts">
const { t } = useI18n()
const api = useRequestFetch()
const current = await api<{
  host: string
  port: number
  secure: boolean
  username: string
  fromEmail: string
  fromName: string | null
  imapHost: string | null
  imapPort: number | null
  imapSecure: boolean | null
  hasPassword?: boolean
} | null>('/api/outreach/smtp')

const form = reactive({
  host: current?.host || '',
  port: current?.port || 587,
  secure: current?.secure || false,
  username: current?.username || '',
  password: '',
  fromEmail: current?.fromEmail || '',
  fromName: current?.fromName || '',
  imapHost: current?.imapHost || '',
  imapPort: current?.imapPort || 993,
  imapSecure: current?.imapSecure ?? true,
})
const error = ref('')
const message = ref('')
const busy = ref(false)

function body() {
  return {
    ...form,
    port: Number(form.port),
    imapPort: form.imapHost ? Number(form.imapPort) : undefined,
    password: form.password || undefined,
  }
}

async function save() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await api('/api/outreach/smtp', {
      method: 'PUT',
      body: body(),
    })
    message.value = t('common.save')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

async function test() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await api('/api/outreach/smtp/test', {
      method: 'POST',
      body: body(),
    })
    message.value = t('outreach.tested')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}
</script>

<template>
  <div class="space-y-5">
    <AppBack to="/outreach" />
    <AppPageHead :title="t('outreach.settings')" :lead="t('outreach.lead')" />
    <form class="space-y-4" @submit.prevent="save">
      <div class="grid items-start gap-4 lg:grid-cols-2">
        <UiCard class="grid gap-3 sm:grid-cols-2">
          <h2 class="font-display text-2xl font-semibold tracking-tight sm:col-span-2">
            {{ t('outreach.smtp') }}
          </h2>
          <UiField :label="t('outreach.host')"><UiInput v-model="form.host" required /></UiField>
          <UiField :label="t('outreach.port')"><UiInput v-model="form.port" type="number" required /></UiField>
          <UiField :label="t('outreach.username')"><UiInput v-model="form.username" required /></UiField>
          <UiField :label="t('outreach.password')"><UiInput v-model="form.password" type="password" /></UiField>
          <UiField :label="t('outreach.fromEmail')"><UiInput v-model="form.fromEmail" type="email" required /></UiField>
          <UiField :label="t('outreach.fromName')"><UiInput v-model="form.fromName" /></UiField>
          <label class="flex items-center gap-2 text-sm sm:col-span-2">
            <input v-model="form.secure" type="checkbox"> {{ t('outreach.secure') }}
          </label>
        </UiCard>
        <UiCard tone="soft" class="grid gap-3 sm:grid-cols-2">
          <h2 class="font-display text-2xl font-semibold tracking-tight sm:col-span-2">
            {{ t('outreach.imap') }}
          </h2>
          <UiField class="sm:col-span-2" :label="t('outreach.host')"><UiInput v-model="form.imapHost" /></UiField>
          <UiField :label="t('outreach.port')"><UiInput v-model="form.imapPort" type="number" /></UiField>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.imapSecure" type="checkbox"> {{ t('outreach.secure') }}
          </label>
        </UiCard>
      </div>
      <UiAlert :message="error" />
      <p v-if="message" class="text-sm text-accent">
        {{ message }}
      </p>
      <div class="flex gap-2">
        <UiButton type="submit" :disabled="busy">
          {{ t('outreach.save') }}
        </UiButton>
        <UiButton type="button" variant="ghost" :disabled="busy" @click="test">
          {{ t('outreach.test') }}
        </UiButton>
      </div>
    </form>
  </div>
</template>
