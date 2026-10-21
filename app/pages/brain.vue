<script setup lang="ts">
const { t } = useI18n()
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
const images = me.brand?.imageIds || []
const logo = me.brand?.logoMediaId
const message = ref('')
const error = ref('')

async function save() {
  error.value = ''
  try {
    await api('/api/brain', {
      method: 'PUT',
      body: {
        ...brand,
        colors: brand.colors.split(',').map(item => item.trim()).filter(Boolean),
        fonts: brand.fonts.split(',').map(item => item.trim()).filter(Boolean),
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
  <form class="mx-auto max-w-3xl space-y-5" @submit.prevent="save">
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('brain.title') }}
      </h1>
      <p class="mt-3 text-stone-600">
        {{ t('brain.lead') }}
        <NuxtLink :to="localePath('/files')" class="font-medium text-accent">{{ t('brain.files') }}</NuxtLink>
      </p>
    </div>
    <div v-if="logo || images.length" class="flex gap-3">
      <img v-if="logo" :src="`/api/media/${logo}`" alt="" class="h-24 w-24 rounded-3xl object-cover">
      <img v-for="image in images" :key="image" :src="`/api/media/${image}`" alt="" class="h-24 w-24 rounded-3xl object-cover">
    </div>
    <UiField :label="t('brain.website')">
      <UiInput v-model="brand.websiteUrl" />
    </UiField>
    <UiField :label="t('brain.company')">
      <UiInput v-model="brand.companyName" />
    </UiField>
    <UiField :label="t('brain.who')">
      <UiTextarea v-model="brand.whoTheyAre" />
    </UiField>
    <UiField :label="t('brain.what')">
      <UiTextarea v-model="brand.whatTheyDo" />
    </UiField>
    <UiField :label="t('brain.audience')">
      <UiTextarea v-model="brand.audience" />
    </UiField>
    <UiField :label="t('brain.tone')">
      <UiTextarea v-model="brand.toneOfVoice" />
    </UiField>
    <UiField :label="t('brain.colors')">
      <UiInput v-model="brand.colors" />
    </UiField>
    <UiField :label="t('brain.fonts')">
      <UiInput v-model="brand.fonts" />
    </UiField>
    <UiAlert :message="error" />
    <p v-if="message" class="text-sm text-accent">
      {{ message }}
    </p>
    <UiButton type="submit">
      {{ t('brain.save') }}
    </UiButton>
  </form>
</template>
