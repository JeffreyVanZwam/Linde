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
  try {
    const result = await $fetch<{ token: string }>('/api/auth/register', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    useNuxtApp().$pb.authStore.save(result.token)
    await refreshMe()
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
    busy.value = false
    return
  }
  await navigateTo(localePath('/onboarding'))
  busy.value = false
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div>
      <p class="font-display font-semibold tracking-tight text-4xl">
        {{ t('auth.registerTitle') }}
      </p>
      <p class="mt-2 text-sm text-muted">
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
    <p class="text-sm text-muted">
      {{ t('auth.hasAccount') }}
      <NuxtLink :to="localePath('/login')" class="font-medium text-accent">
        {{ t('auth.login') }}
      </NuxtLink>
    </p>
  </form>
</template>
