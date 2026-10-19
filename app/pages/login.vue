<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
const localePath = useLocalePath()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  const result = await authClient.signIn.email({ email: email.value, password: password.value })
  if (result.error) {
    error.value = result.error.message || t('common.error')
    busy.value = false
    return
  }
  await refreshMe()
  const me = useState<{ brand: { onboardingCompleted: boolean } | null }>('me')
  await navigateTo(localePath(me.value?.brand?.onboardingCompleted ? '/' : '/onboarding'))
  busy.value = false
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div>
      <p class="font-serif text-4xl">
        {{ t('auth.loginTitle') }}
      </p>
      <p class="mt-2 text-sm text-stone-600">
        {{ t('auth.loginLead') }}
      </p>
    </div>
    <UiField :label="t('auth.email')">
      <UiInput v-model="email" type="email" required />
    </UiField>
    <UiField :label="t('auth.password')">
      <UiInput v-model="password" type="password" required />
    </UiField>
    <UiAlert :message="error" />
    <UiButton type="submit" :disabled="busy">
      {{ t('auth.login') }}
    </UiButton>
    <p class="text-sm text-stone-600">
      {{ t('auth.noAccount') }}
      <NuxtLink :to="localePath('/register')" class="font-medium text-accent">
        {{ t('auth.register') }}
      </NuxtLink>
    </p>
  </form>
</template>
