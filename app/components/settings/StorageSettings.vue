<script setup lang="ts">
const props = defineProps<{ admin: boolean }>()
const { t } = useI18n()
const api = useRequestFetch()
const current = await api<{
  mode: 'local' | 's3'
  s3: { bucket: string, region: string, endpoint: string, accessKey: string, forcePathStyle: boolean, hasSecret: boolean }
}>('/api/settings/storage')

const form = reactive({
  mode: current.mode,
  bucket: current.s3.bucket,
  region: current.s3.region,
  endpoint: current.s3.endpoint,
  accessKey: current.s3.accessKey,
  secret: '',
  forcePathStyle: current.s3.forcePathStyle,
})
const error = ref('')
const message = ref('')
const busy = ref(false)

async function save() {
  if (!props.admin) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await api('/api/settings/storage', { method: 'PUT', body: { ...form, secret: form.secret || undefined } })
    form.secret = ''
    message.value = t('common.save')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

async function test() {
  if (!props.admin) return
  await save()
  if (error.value) return
  busy.value = true
  error.value = ''
  try {
    await api('/api/settings/storage/test', { method: 'POST' })
    message.value = t('settings.tested')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}
</script>

<template>
  <section class="space-y-3">
    <h2 class="font-serif text-3xl">
      {{ t('settings.storage') }}
    </h2>
    <p class="text-sm text-stone-600">
      {{ t('settings.storageLead') }}
    </p>
    <form class="space-y-4" @submit.prevent="save">
      <div class="flex gap-3 text-sm">
        <label class="flex items-center gap-2">
          <input v-model="form.mode" type="radio" value="local" :disabled="!admin"> {{ t('settings.local') }}
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.mode" type="radio" value="s3" :disabled="!admin"> {{ t('settings.s3') }}
        </label>
      </div>
      <div v-if="form.mode === 's3'" class="grid gap-3 sm:grid-cols-2">
        <UiField :label="t('settings.bucket')"><UiInput v-model="form.bucket" :disabled="!admin" /></UiField>
        <UiField :label="t('settings.region')"><UiInput v-model="form.region" :disabled="!admin" /></UiField>
        <UiField :label="t('settings.endpoint')"><UiInput v-model="form.endpoint" :disabled="!admin" /></UiField>
        <UiField :label="t('settings.accessKey')"><UiInput v-model="form.accessKey" :disabled="!admin" /></UiField>
        <UiField :label="t('settings.secret')">
          <UiInput v-model="form.secret" type="password" :disabled="!admin" :placeholder="current.s3.hasSecret ? t('settings.secretKeep') : ''" />
        </UiField>
        <label class="flex items-center gap-2 text-sm sm:col-span-2">
          <input v-model="form.forcePathStyle" type="checkbox" :disabled="!admin"> {{ t('settings.pathStyle') }}
        </label>
      </div>
      <p v-if="!admin" class="text-sm text-stone-500">
        {{ t('settings.adminOnly') }}
      </p>
      <UiAlert :message="error" />
      <p v-if="message" class="text-sm text-accent">
        {{ message }}
      </p>
      <div v-if="admin" class="flex gap-2">
        <UiButton type="submit" :disabled="busy">
          {{ t('common.save') }}
        </UiButton>
        <UiButton v-if="form.mode === 's3'" type="button" variant="ghost" :disabled="busy" @click="test">
          {{ t('settings.test') }}
        </UiButton>
      </div>
    </form>
  </section>
</template>
