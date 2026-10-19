<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
const localePath = useLocalePath()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  const result = await authClient.signUp.email({ name: name.value, email: email.value, password: password.value })
  if (result.error) {
    error.value = result.error.message || t('common.error')
    busy.value = false
    return
  }
  await refreshMe()
  await navigateTo(localePath('/onboarding'))
  busy.value = false
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div>
      <p class="font-serif text-4xl">
        {{ t('auth.registerTitle') }}
      </p>
      <p class="mt-2 text-sm text-stone-600">
        {{ t('auth.registerLead') }}
      </p>
    </div>
    <UiField :label="t('auth.name')">
      <UiInput v-model="name" required />
    </UiField>
    <UiField :label="t('auth.email')">
      <UiInput v-model="email" type="email" required />
    </UiField>
    <UiField :label="t('auth.password')">
      <UiInput v-model="password" type="password" required minlength="8" />
    </UiField>
    <UiAlert :message="error" />
    <UiButton type="submit" :disabled="busy">
      {{ t('auth.register') }}
    </UiButton>
    <p class="text-sm text-stone-600">
      {{ t('auth.hasAccount') }}
      <NuxtLink :to="localePath('/login')" class="font-medium text-accent">
        {{ t('auth.login') }}
      </NuxtLink>
    </p>
  </form>
</template>
