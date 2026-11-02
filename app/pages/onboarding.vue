<script setup lang="ts">
import { dossierFromLegacy, type BrandDossier } from '~~/shared/dossier'

definePageMeta({ layout: 'focus' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const url = ref('')
const busy = ref(false)
const extracting = ref(false)
const confirmOpen = ref(false)
const error = ref('')

type Brand = {
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

const brand = ref<Brand | null>(null)
const dossier = ref<BrandDossier | null>(null)
const colors = ref('')
const fonts = ref('')

function applyBrand(source: Brand | null | undefined) {
  if (!source?.websiteUrl && !source?.dossier) return
  brand.value = {
    ...source,
    websiteUrl: source.websiteUrl || '',
    companyName: source.companyName || '',
    whoTheyAre: source.whoTheyAre || '',
    whatTheyDo: source.whatTheyDo || '',
    audience: source.audience || '',
    toneOfVoice: source.toneOfVoice || '',
    colors: source.colors || [],
    fonts: source.fonts || [],
    imageIds: source.imageIds || [],
  }
  url.value = source.websiteUrl || ''
  colors.value = (source.colors || []).join(', ')
  fonts.value = (source.fonts || []).join(', ')
  dossier.value = dossierFromLegacy(source)
}

const api = useRequestFetch()
const me = useState<{ brand: Brand | null } | null>('me')
applyBrand(me.value?.brand)
if (!brand.value) {
  try {
    const existing = await api<{ brand: Brand | null }>('/api/me')
    applyBrand(existing.brand)
  }
  catch {
    // Anonieme bezoekers gaan via de middleware naar login.
  }
}

watch(() => dossier.value?.foundation.brief.geo.operator, (value) => {
  if (value != null && brand.value && brand.value.companyName !== value) brand.value.companyName = value
})

watch(() => dossier.value?.foundation.brief.geo.url, (value) => {
  if (!value || !brand.value) return
  if (brand.value.websiteUrl !== value) brand.value.websiteUrl = value
  if (url.value !== value) url.value = value
})

function requestExtract() {
  if (extracting.value) return
  if (brand.value && dossier.value) {
    confirmOpen.value = true
    return
  }
  extract()
}

async function extract() {
  busy.value = true
  extracting.value = true
  error.value = ''
  try {
    const extracted = await api<Brand>('/api/brain/extract', {
      method: 'POST',
      body: { url: url.value, locale: locale.value },
    })
    applyBrand(extracted)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
    extracting.value = false
    confirmOpen.value = false
  }
}

async function save() {
  if (!brand.value || !dossier.value) return
  busy.value = true
  error.value = ''
  try {
    await api('/api/brain', {
      method: 'PUT',
      body: {
        ...brand.value,
        colors: colors.value.split(',').map(item => item.trim()).filter(Boolean),
        fonts: fonts.value.split(',').map(item => item.trim()).filter(Boolean),
        dossier: dossier.value,
        onboardingCompleted: true,
      },
    })
    await refreshMe()
    await navigateTo(localePath('/'))
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display font-semibold tracking-tight text-5xl">
        {{ t('onboarding.title') }}
      </h1>
      <p class="mt-3 max-w-2xl text-muted">
        {{ t('onboarding.lead') }}
      </p>
    </div>
    <UiCard>
      <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="requestExtract">
        <UiInput v-model="url" type="url" required :placeholder="t('onboarding.url')" />
        <UiButton type="submit" :disabled="busy">
          {{ extracting ? t('common.loading') : t('onboarding.extract') }}
        </UiButton>
      </form>
      <p v-if="extracting" class="mt-3 text-sm text-muted">
        {{ t('onboarding.extracting') }}
      </p>
    </UiCard>
    <UiAlert :message="error" />
    <form v-if="brand && dossier" class="space-y-5" @submit.prevent="save">
      <div>
        <h2 class="font-display font-semibold tracking-tight text-3xl">
          {{ t('onboarding.review') }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm text-muted">
          {{ t('onboarding.reviewLead') }}
        </p>
      </div>
      <UiCard>
        <h2 class="font-display text-2xl font-semibold tracking-tight">
          {{ t('onboarding.visuals') }}
        </h2>
        <p class="mt-1 text-sm text-muted">
          {{ t('onboarding.visualsLead') }}
        </p>
        <div v-if="brand.logoMediaId || brand.imageIds.length" class="mt-4 flex gap-3 overflow-x-auto">
          <img v-if="brand.logoMediaId" :src="`/api/media/${brand.logoMediaId}`" alt="" class="h-20 w-20 rounded-2xl object-cover">
          <img v-for="image in brand.imageIds" :key="image" :src="`/api/media/${image}`" alt="" class="h-20 w-20 rounded-2xl object-cover">
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <UiField :label="t('brain.colors')">
            <UiInput v-model="colors" />
          </UiField>
          <UiField :label="t('brain.fonts')">
            <UiInput v-model="fonts" />
          </UiField>
        </div>
      </UiCard>
      <DossierEditor v-model="dossier" />
      <UiButton type="submit" :disabled="busy">
        {{ t('onboarding.save') }}
      </UiButton>
    </form>
    <UiConfirmModal
      v-if="confirmOpen"
      :title="t('brain.rerunTitle')"
      :message="t('brain.rerunLead')"
      :confirm-label="t('brain.rerunConfirm')"
      :cancel-label="t('common.cancel')"
      :busy="extracting"
      :busy-label="t('common.loading')"
      :progress="t('onboarding.extracting')"
      @confirm="extract"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
