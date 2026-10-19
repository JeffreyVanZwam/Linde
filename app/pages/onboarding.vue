<script setup lang="ts">
definePageMeta({ layout: 'focus' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const url = ref('')
const busy = ref(false)
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
}

const brand = ref<Brand | null>(null)
const colors = ref('')
const fonts = ref('')

function applyBrand(source: Brand | null | undefined) {
  if (!source?.websiteUrl) return
  brand.value = {
    ...source,
    companyName: source.companyName || '',
    whoTheyAre: source.whoTheyAre || '',
    whatTheyDo: source.whatTheyDo || '',
    audience: source.audience || '',
    toneOfVoice: source.toneOfVoice || '',
  }
  url.value = source.websiteUrl
  colors.value = source.colors.join(', ')
  fonts.value = source.fonts.join(', ')
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

async function extract() {
  busy.value = true
  error.value = ''
  try {
    brand.value = await api<Brand>('/api/brain/extract', {
      method: 'POST',
      body: { url: url.value, locale: locale.value },
    })
    colors.value = brand.value.colors.join(', ')
    fonts.value = brand.value.fonts.join(', ')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}

async function save() {
  if (!brand.value) return
  busy.value = true
  error.value = ''
  try {
    await api('/api/brain', {
      method: 'PUT',
      body: {
        ...brand.value,
        colors: colors.value.split(',').map(item => item.trim()).filter(Boolean),
        fonts: fonts.value.split(',').map(item => item.trim()).filter(Boolean),
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
      <h1 class="font-serif text-5xl">
        {{ t('onboarding.title') }}
      </h1>
      <p class="mt-3 max-w-xl text-stone-600">
        {{ t('onboarding.lead') }}
      </p>
    </div>
    <UiCard>
      <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="extract">
        <UiInput v-model="url" type="url" required :placeholder="t('onboarding.url')" />
        <UiButton type="submit" :disabled="busy">
          {{ t('onboarding.extract') }}
        </UiButton>
      </form>
    </UiCard>
    <UiAlert :message="error" />
    <form v-if="brand" class="space-y-4" @submit.prevent="save">
      <h2 class="font-serif text-3xl">
        {{ t('onboarding.review') }}
      </h2>
      <div v-if="brand.logoMediaId || brand.imageIds.length" class="flex gap-3 overflow-x-auto">
        <img v-if="brand.logoMediaId" :src="`/api/media/${brand.logoMediaId}`" alt="" class="h-20 w-20 rounded-2xl object-cover">
        <img v-for="image in brand.imageIds" :key="image" :src="`/api/media/${image}`" alt="" class="h-20 w-20 rounded-2xl object-cover">
      </div>
      <UiField :label="t('brain.company')">
        <UiInput v-model="brand.companyName!" />
      </UiField>
      <UiField :label="t('brain.who')">
        <UiTextarea v-model="brand.whoTheyAre!" />
      </UiField>
      <UiField :label="t('brain.what')">
        <UiTextarea v-model="brand.whatTheyDo!" />
      </UiField>
      <UiField :label="t('brain.audience')">
        <UiTextarea v-model="brand.audience!" />
      </UiField>
      <UiField :label="t('brain.tone')">
        <UiTextarea v-model="brand.toneOfVoice!" />
      </UiField>
      <UiField :label="t('brain.colors')">
        <UiInput v-model="colors" />
      </UiField>
      <UiField :label="t('brain.fonts')">
        <UiInput v-model="fonts" />
      </UiField>
      <UiButton type="submit" :disabled="busy">
        {{ t('onboarding.save') }}
      </UiButton>
    </form>
  </div>
</template>
