<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const { t } = useI18n()
const route = useRoute()
const ok = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    await $fetch('/api/outreach/unsubscribe', {
      query: { id: route.query.id, token: route.query.token },
    })
    ok.value = true
  }
  catch (cause) {
    error.value = errorText(cause) || t('unsubscribe.invalid')
  }
})
</script>

<template>
  <div class="space-y-3">
    <h1 class="font-serif text-4xl">
      {{ ok ? t('unsubscribe.title') : t('common.error') }}
    </h1>
    <p class="text-sm text-stone-600">
      {{ ok ? t('unsubscribe.lead') : error }}
    </p>
  </div>
</template>
