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
  <form class="grid gap-5 lg:grid-cols-2" @submit.prevent="save">
    <div class="lg:col-span-2">
      <h1 class="font-display text-5xl font-semibold tracking-tight">
        {{ t('brain.title') }}
      </h1>
      <p class="mt-3 text-muted">
        {{ t('brain.lead') }}
        <NuxtLink :to="localePath('/files')" class="font-medium text-accent">{{ t('brain.files') }}</NuxtLink>
      </p>
    </div>
    <div v-if="logo || images.length" class="flex gap-3 lg:col-span-2">
      <img v-if="logo" :src="`/api/media/${logo}`" alt="" class="h-24 w-24 rounded-3xl object-cover">
      <img v-for="image in images" :key="image" :src="`/api/media/${image}`" alt="" class="h-24 w-24 rounded-3xl object-cover">
    </div>
    <UiField :label="t('brain.website')">
      <UiInput v-model="brand.websiteUrl" />
    </UiField>
    <UiField :label="t('brain.company')">
      <UiInput v-model="brand.companyName" />
    </UiField>
    <div class="flex flex-wrap items-center gap-3 lg:col-span-2">
      <UiButton type="button" variant="ghost" :disabled="extracting || !brand.websiteUrl.trim()" @click="confirmOpen = true">
        {{ extracting ? t('common.loading') : t('brain.rerun') }}
      </UiButton>
      <p v-if="extracting" class="text-sm text-muted">
        {{ t('onboarding.extracting') }}
      </p>
    </div>
    <div v-if="dossier" class="lg:col-span-2">
      <h2 class="font-display text-3xl font-semibold tracking-tight">
        {{ t('brain.dossier') }}
      </h2>
      <p class="mt-2 max-w-2xl text-sm text-muted">
        {{ t('brain.dossierLead') }}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton variant="ghost" :to="localePath('/audit')">
          {{ t('nav.audit') }}
        </UiButton>
        <UiButton variant="ghost" :to="localePath('/foundation')">
          {{ t('nav.foundation') }}
        </UiButton>
      </div>
    </div>
    <template v-else>
      <UiField class="lg:col-span-2" :label="t('brain.who')">
        <UiTextarea v-model="brand.whoTheyAre" />
      </UiField>
      <UiField class="lg:col-span-2" :label="t('brain.what')">
        <UiTextarea v-model="brand.whatTheyDo" />
      </UiField>
      <UiField class="lg:col-span-2" :label="t('brain.audience')">
        <UiTextarea v-model="brand.audience" />
      </UiField>
      <UiField class="lg:col-span-2" :label="t('brain.tone')">
        <UiTextarea v-model="brand.toneOfVoice" />
      </UiField>
    </template>
    <UiField :label="t('brain.colors')">
      <UiInput v-model="brand.colors" />
    </UiField>
    <UiField :label="t('brain.fonts')">
      <UiInput v-model="brand.fonts" />
    </UiField>
    <div class="flex flex-wrap items-center gap-3 lg:col-span-2">
      <UiButton type="submit">
        {{ t('brain.save') }}
      </UiButton>
      <p v-if="message" class="text-sm text-accent">
        {{ message }}
      </p>
    </div>
    <UiAlert class="lg:col-span-2" :message="error" />
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
