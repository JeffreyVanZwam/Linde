<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
type CampaignDetail = {
  campaign: { id: string, name: string, goal: string | null, audience: string | null, offer: string | null }
  steps: Array<{ id: string, subject: string, body: string, delayHours: number }>
  recipients: Array<{ id: string, email: string, name: string | null, status: string }>
  messages: Array<{ id: string, subject: string, body: string, status: string, scheduledAt: string | null, recipientId: string }>
}

const api = useRequestFetch() as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
const campaignId = String(route.params.id)
const data = ref(await api<CampaignDetail>(`/api/outreach/campaigns/${campaignId}`))
const csv = ref('')
const error = ref('')
const tab = ref('steps')
const tabs = computed(() => [
  { id: 'steps', label: t('outreach.steps') },
  { id: 'people', label: t('outreach.recipients') },
  { id: 'mail', label: t('shell.messages') },
])

async function reload() {
  data.value = await api<CampaignDetail>(`/api/outreach/campaigns/${campaignId}`)
}

async function addRecipients() {
  error.value = ''
  try {
    await api(`/api/outreach/campaigns/${campaignId}/recipients`, { method: 'POST', body: { csv: csv.value } })
    csv.value = ''
    await reload()
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function materialize() {
  await api(`/api/outreach/campaigns/${campaignId}/materialize`, { method: 'POST' })
  await reload()
}

async function update(id: string, status: string, scheduledAt?: string) {
  await api(`/api/outreach/messages/${id}`, {
    method: 'PATCH',
    body: { status, scheduledAt },
  })
  await reload()
}

async function approveAll() {
  for (const message of data.value.messages.filter(item => item.status === 'draft')) {
    await update(message.id, 'approved')
  }
}
</script>

<template>
  <div class="space-y-5">
    <AppBack to="/outreach" />
    <AppPageHead :title="data.campaign.name" :lead="[data.campaign.audience, data.campaign.offer].filter(Boolean).join(' · ')" />
    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard>
        <p class="text-sm text-muted">{{ t('outreach.steps') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ data.steps.length }}</p>
      </UiCard>
      <UiCard tone="highlight">
        <p class="text-sm opacity-80">{{ t('outreach.recipients') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ data.recipients.length }}</p>
      </UiCard>
      <UiCard tone="ink">
        <p class="text-sm opacity-75">{{ t('shell.messages') }}</p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">{{ data.messages.length }}</p>
      </UiCard>
    </div>
    <UiTabs v-model="tab" :items="tabs" :label="data.campaign.name" />
    <div v-if="tab === 'steps'" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="(step, index) in data.steps" :key="step.id" class="rounded-[1.5rem] border border-line bg-surface p-5">
        <p class="text-xs font-medium text-muted">
          {{ index + 1 }} · +{{ step.delayHours }}u
        </p>
        <p class="mt-2 font-display text-xl font-semibold tracking-tight">
          {{ step.subject }}
        </p>
        <p class="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-muted">
          {{ step.body }}
        </p>
      </article>
    </div>
    <div v-else-if="tab === 'people'" class="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <UiCard>
        <h2 class="font-display text-2xl font-semibold tracking-tight">
          {{ t('outreach.add') }}
        </h2>
        <form class="mt-3 space-y-3" @submit.prevent="addRecipients">
          <UiTextarea v-model="csv" :placeholder="t('outreach.csv')" />
          <div class="flex flex-wrap gap-2">
            <UiButton type="submit">
              {{ t('outreach.add') }}
            </UiButton>
            <UiButton type="button" variant="ghost" @click="materialize">
              {{ t('outreach.materialize') }}
            </UiButton>
          </div>
        </form>
      </UiCard>
      <div class="grid gap-2 sm:grid-cols-2">
        <p v-for="recipient in data.recipients" :key="recipient.id" class="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          <span class="block truncate font-medium">{{ recipient.name || recipient.email }}</span>
          <span class="text-muted">{{ recipient.email }} · {{ recipient.status }}</span>
        </p>
      </div>
    </div>
    <div v-else class="space-y-3">
      <UiButton variant="ghost" @click="approveAll">
        {{ t('outreach.approveAll') }}
      </UiButton>
      <div class="grid gap-3 lg:grid-cols-2">
        <UiCard v-for="message in data.messages" :key="message.id">
          <p class="text-xs uppercase text-muted">
            {{ message.status }}
          </p>
          <p class="mt-1 font-medium">
            {{ message.subject }}
          </p>
          <p class="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-muted">
            {{ message.body }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton @click="update(message.id, 'approved')">
              {{ t('outreach.approve') }}
            </UiButton>
            <UiButton variant="ghost" @click="update(message.id, 'scheduled', new Date(Date.now() + 3600_000).toISOString())">
              {{ t('social.schedule') }}
            </UiButton>
            <UiButton variant="danger" @click="update(message.id, 'cancelled')">
              {{ t('outreach.cancel') }}
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
    <UiAlert :message="error" />
  </div>
</template>
