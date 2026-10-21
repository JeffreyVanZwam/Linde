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
  <div class="space-y-6">
    <AppBack to="/outreach" />
    <div>
      <h1 class="font-display font-semibold tracking-tight text-5xl">
        {{ data.campaign.name }}
      </h1>
      <p class="mt-3 max-w-2xl text-sm text-muted">
        {{ data.campaign.audience }} · {{ data.campaign.offer }}
      </p>
    </div>
    <UiCard>
      <h2 class="font-display font-semibold tracking-tight text-2xl">
        {{ t('outreach.steps') }}
      </h2>
      <article v-for="step in data.steps" :key="step.id" class="mt-4 border-t border-line pt-4">
        <p class="text-xs text-muted">
          +{{ step.delayHours }}u
        </p>
        <p class="font-medium">
          {{ step.subject }}
        </p>
        <p class="whitespace-pre-wrap text-sm text-muted">
          {{ step.body }}
        </p>
      </article>
    </UiCard>
    <UiCard>
      <h2 class="font-display font-semibold tracking-tight text-2xl">
        {{ t('outreach.recipients') }}
      </h2>
      <form class="mt-3 space-y-3" @submit.prevent="addRecipients">
        <UiTextarea v-model="csv" :placeholder="t('outreach.csv')" />
        <UiButton type="submit">
          {{ t('outreach.add') }}
        </UiButton>
      </form>
      <p v-for="recipient in data.recipients" :key="recipient.id" class="mt-2 text-sm">
        {{ recipient.email }} · {{ recipient.status }}
      </p>
      <UiButton class="mt-4" variant="ghost" @click="materialize">
        {{ t('outreach.materialize') }}
      </UiButton>
    </UiCard>
    <div class="flex gap-2">
      <UiButton variant="ghost" @click="approveAll">
        {{ t('outreach.approveAll') }}
      </UiButton>
    </div>
    <UiCard v-for="message in data.messages" :key="message.id">
      <p class="text-xs uppercase text-muted">
        {{ message.status }}
      </p>
      <p class="font-medium">
        {{ message.subject }}
      </p>
      <p class="whitespace-pre-wrap text-sm text-muted">
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
    <UiAlert :message="error" />
  </div>
</template>
