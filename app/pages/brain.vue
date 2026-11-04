<script setup lang="ts">
import { dossierFromLegacy, type BrandDossier } from '~~/shared/dossier'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const me = await api<{ brand: {
  websiteUrl: string | null
  companyName: string | null
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  colors: string[]
  fonts: string[]
  logoMediaId: string | null
  imageIds: string[]
  dossier?: unknown
} | null }>('/api/me')

const brand = reactive({
  websiteUrl: me.brand?.websiteUrl || '',
  companyName: me.brand?.companyName || '',
  whoTheyAre: me.brand?.whoTheyAre || '',
  whatTheyDo: me.brand?.whatTheyDo || '',
  audience: me.brand?.audience || '',
  toneOfVoice: me.brand?.toneOfVoice || '',
  colors: me.brand?.colors.join(', ') || '',
  fonts: me.brand?.fonts.join(', ') || '',
})
const images = ref(me.brand?.imageIds || [])
const logo = ref<string | null>(me.brand?.logoMediaId || null)
const dossier = ref<BrandDossier | null>(me.brand?.dossier ? dossierFromLegacy(me.brand) : null)
const message = ref('')
const error = ref('')
const extracting = ref(false)
const confirmOpen = ref(false)
const tab = ref('profile')
type Note = { id: string, kind: string, title: string, body: string }
const notes = ref<Note[]>([])
const noteKind = ref<'note' | 'voice' | 'document'>('note')
const noteTitle = ref('')
const noteBody = ref('')
const noteFile = ref('')
try {
  notes.value = await api<Note[]>('/api/brain/notes')
}
catch {
  notes.value = []
}

async function addNote() {
  error.value = ''
  try {
    await api('/api/brain/notes', {
      method: 'POST',
      body: { kind: noteKind.value, title: noteTitle.value, body: noteBody.value, fileId: noteFile.value || undefined },
    })
    noteTitle.value = ''
    noteBody.value = ''
    noteFile.value = ''
    notes.value = await api<Note[]>('/api/brain/notes')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function removeNote(id: string) {
  await api(`/api/brain/notes/${id}`, { method: 'DELETE' })
  notes.value = notes.value.filter(note => note.id !== id)
}

const tabs = computed(() => [
  { id: 'profile', label: t('shell.profile') },
  { id: 'knowledge', label: t('forge.notes') },
  { id: 'story', label: t('shell.story') },
  { id: 'dossier', label: t('brain.dossier') },
])
const swatches = computed(() => brand.colors.split(',').map(item => item.trim()).filter(Boolean))

type ExtractedBrand = {
  websiteUrl: string | null
  companyName: string | null
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  colors: string[]
  fonts: string[]
  logoMediaId: string | null
  imageIds: string[]
  dossier?: unknown
}

function applyExtracted(source: ExtractedBrand) {
  brand.websiteUrl = source.websiteUrl || ''
  brand.companyName = source.companyName || ''
  brand.whoTheyAre = source.whoTheyAre || ''
  brand.whatTheyDo = source.whatTheyDo || ''
  brand.audience = source.audience || ''
  brand.toneOfVoice = source.toneOfVoice || ''
  brand.colors = (source.colors || []).join(', ')
  brand.fonts = (source.fonts || []).join(', ')
  images.value = source.imageIds || []
  logo.value = source.logoMediaId
  dossier.value = source.dossier ? dossierFromLegacy(source) : null
}

watch(() => dossier.value?.foundation.brief.geo.operator, (value) => {
  if (value != null && brand.companyName !== value) brand.companyName = value
})

watch(() => dossier.value?.foundation.brief.geo.url, (value) => {
  if (value && brand.websiteUrl !== value) brand.websiteUrl = value
})

watch(() => brand.websiteUrl, (value) => {
  if (dossier.value && dossier.value.foundation.brief.geo.url !== value) dossier.value.foundation.brief.geo.url = value
})

watch(() => brand.companyName, (value) => {
  if (dossier.value && dossier.value.foundation.brief.geo.operator !== value) dossier.value.foundation.brief.geo.operator = value
})

async function rerun() {
  if (!brand.websiteUrl.trim() || extracting.value) return
  extracting.value = true
  error.value = ''
  message.value = ''
  try {
    const extracted = await api<ExtractedBrand>('/api/brain/extract', {
      method: 'POST',
      body: { url: brand.websiteUrl, locale: locale.value },
    })
    applyExtracted(extracted)
    await refreshMe()
    message.value = t('brain.rerunDone')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    extracting.value = false
    confirmOpen.value = false
  }
}

async function save() {
  error.value = ''
  try {
    await api('/api/brain', {
      method: 'PUT',
      body: {
        ...brand,
        colors: brand.colors.split(',').map(item => item.trim()).filter(Boolean),
        fonts: brand.fonts.split(',').map(item => item.trim()).filter(Boolean),
        dossier: dossier.value || undefined,
      },
    })
    await refreshMe()
    message.value = t('common.save')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <AppPageHead :title="t('brain.title')">
      <template #lead>
        {{ t('brain.lead') }}
        <NuxtLink :to="localePath('/files')" class="font-medium text-accent">{{ t('brain.files') }}</NuxtLink>
      </template>
      <template #actions>
        <UiButton type="button" variant="ghost" :disabled="extracting || !brand.websiteUrl.trim()" @click="confirmOpen = true">
          {{ extracting ? t('common.loading') : t('brain.rerun') }}
        </UiButton>
        <UiButton type="submit">
          {{ t('brain.save') }}
        </UiButton>
      </template>
    </AppPageHead>
    <p v-if="extracting" class="text-sm text-muted">
      {{ t('onboarding.extracting') }}
    </p>
    <p v-if="message" class="text-sm text-accent">
      {{ message }}
    </p>

    <UiTabs v-model="tab" :items="tabs" :label="t('brain.title')" />

    <div v-if="tab === 'profile'" class="grid items-start gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
      <UiCard tone="ink" class="flex min-h-72 flex-col justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.16em] opacity-70">
            {{ brand.companyName || t('brain.company') }}
          </p>
          <div v-if="logo || images.length" class="mt-4 flex gap-2 overflow-x-auto">
            <img v-if="logo" :src="`/api/media/${logo}`" alt="" class="size-20 rounded-2xl object-cover ring-2 ring-white/30">
            <img v-for="image in images" :key="image" :src="`/api/media/${image}`" alt="" class="size-20 rounded-2xl object-cover ring-2 ring-white/20">
          </div>
        </div>
        <div v-if="swatches.length" class="mt-6 grid grid-cols-4 gap-2">
          <span v-for="color in swatches" :key="color" class="aspect-square rounded-2xl ring-2 ring-white/25" :style="{ background: color }" />
        </div>
      </UiCard>
      <UiCard class="grid gap-4 sm:grid-cols-2">
        <UiField class="sm:col-span-2" :label="t('brain.website')">
          <UiInput v-model="brand.websiteUrl" />
        </UiField>
        <UiField class="sm:col-span-2" :label="t('brain.company')">
          <UiInput v-model="brand.companyName" />
        </UiField>
        <UiField :label="t('brain.colors')">
          <UiInput v-model="brand.colors" />
        </UiField>
        <UiField :label="t('brain.fonts')">
          <UiInput v-model="brand.fonts" />
        </UiField>
      </UiCard>
    </div>

    <div v-else-if="tab === 'story'">
      <div v-if="dossier" class="grid gap-3 md:grid-cols-2">
        <UiCard tone="soft">
          <p class="text-sm text-muted">{{ t('brain.dossierLead') }}</p>
        </UiCard>
        <UiCard>
          <p class="font-display text-2xl font-semibold tracking-tight">{{ brand.toneOfVoice || t('brain.tone') }}</p>
        </UiCard>
      </div>
      <div v-else class="grid gap-3 md:grid-cols-2">
        <UiCard>
          <UiField :label="t('brain.who')">
            <UiTextarea v-model="brand.whoTheyAre" />
          </UiField>
        </UiCard>
        <UiCard>
          <UiField :label="t('brain.what')">
            <UiTextarea v-model="brand.whatTheyDo" />
          </UiField>
        </UiCard>
        <UiCard>
          <UiField :label="t('brain.audience')">
            <UiTextarea v-model="brand.audience" />
          </UiField>
        </UiCard>
        <UiCard tone="soft">
          <UiField :label="t('brain.tone')">
            <UiTextarea v-model="brand.toneOfVoice" />
          </UiField>
        </UiCard>
      </div>
    </div>

    <div v-else-if="tab === 'knowledge'" class="space-y-4">
      <UiCard>
        <div class="flex flex-wrap gap-2">
          <button v-for="kind in ['note', 'voice', 'document']" :key="kind" type="button" class="rounded-full px-3 py-1 text-sm" :class="noteKind === kind ? 'bg-cta text-cta-ink' : 'bg-soft'" @click="noteKind = kind as 'note' | 'voice' | 'document'">
            {{ t(`forge.${kind}`) }}
          </button>
        </div>
        <UiInput v-model="noteTitle" class="mt-3" :placeholder="t('forge.notes')" />
        <UiTextarea v-model="noteBody" class="mt-3" :rows="5" />
        <UiInput v-model="noteFile" class="mt-3" :placeholder="t('forge.file')" />
        <UiButton class="mt-3" type="button" @click="addNote">{{ t('forge.add') }}</UiButton>
      </UiCard>
      <UiCard v-for="note in notes" :key="note.id">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted">{{ note.kind }}</p>
            <p class="font-medium">{{ note.title }}</p>
            <p class="mt-2 line-clamp-4 text-sm text-muted">{{ note.body }}</p>
          </div>
          <button type="button" class="text-sm text-muted" @click="removeNote(note.id)">{{ t('chat.delete') }}</button>
        </div>
      </UiCard>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <p class="text-sm text-muted md:col-span-2">
        {{ t('brain.dossierLead') }}
      </p>
      <NuxtLink :to="localePath('/audit')" class="flex min-h-40 flex-col justify-between rounded-[1.6rem] bg-cta p-5 text-cta-ink transition duration-200 hover:-translate-y-0.5">
        <Icon name="solar:clipboard-check-bold-duotone" class="size-7" />
        <span class="font-display text-3xl font-semibold tracking-tight">{{ t('nav.audit') }}</span>
      </NuxtLink>
      <NuxtLink :to="localePath('/foundation')" class="panel-ink flex min-h-40 flex-col justify-between rounded-[1.6rem] p-5 transition duration-200 hover:-translate-y-0.5">
        <Icon name="solar:buildings-3-bold-duotone" class="size-7" />
        <span class="font-display text-3xl font-semibold tracking-tight">{{ t('nav.foundation') }}</span>
      </NuxtLink>
    </div>

    <UiAlert :message="error" />
    <UiConfirmModal
      v-if="confirmOpen"
      :title="t('brain.rerunTitle')"
      :message="t('brain.rerunLead')"
      :confirm-label="t('brain.rerunConfirm')"
      :cancel-label="t('common.cancel')"
      :busy="extracting"
      :busy-label="t('common.loading')"
      :progress="t('onboarding.extracting')"
      @confirm="rerun"
      @cancel="confirmOpen = false"
    />
  </form>
</template>
