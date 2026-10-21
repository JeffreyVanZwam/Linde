<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const me = useState<{ user: { role?: string } } | null>('me')
const admin = computed(() => me.value?.user.role === 'admin')
const providers = await api<{
  aiProvider: string
  tier: 'free' | 'paid'
  model: string
  imageProvider: string
  textReady: boolean
  imageReady: boolean
  mailApi: boolean
  social: Record<string, boolean>
}>('/api/settings/providers')
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('settings.title') }}
      </h1>
      <p class="mt-3 text-stone-600">
        {{ t('settings.lead') }}
      </p>
    </div>
    <section class="space-y-3">
      <h2 class="font-serif text-3xl">
        {{ t('settings.theme') }}
      </h2>
      <AppThemeSwitch />
    </section>
    <StorageSettings :admin="admin" />
    <UserSettings :admin="admin" />
    <UiCard>
      <p class="text-xs uppercase tracking-[0.2em] text-stone-400">
        {{ t('settings.text') }}
      </p>
      <p class="mt-2 font-serif text-3xl">
        {{ providers.tier === 'free' ? t('settings.free') : providers.aiProvider }}
      </p>
      <p class="text-sm text-stone-600">
        {{ providers.model }}
        · {{ providers.tier === 'free' ? t('settings.noKey') : (providers.textReady ? t('settings.ready') : t('settings.missing')) }}
      </p>
    </UiCard>
    <UiCard>
      <p class="text-xs uppercase tracking-[0.2em] text-stone-400">
        {{ t('settings.image') }}
      </p>
      <p class="mt-2 font-serif text-3xl">
        {{ providers.imageProvider === 'none' ? t('settings.off') : providers.imageProvider }}
      </p>
      <p class="text-sm text-stone-600">
        {{ providers.imageReady ? t('settings.ready') : t('settings.missing') }}
      </p>
    </UiCard>
    <UiCard>
      <div class="flex flex-wrap gap-2 text-sm">
        <span v-for="(ready, name) in providers.social" :key="name" class="rounded-full bg-stone-100 px-3 py-1">
          {{ name }} · {{ ready ? t('settings.ready') : t('settings.missing') }}
        </span>
        <span class="rounded-full bg-stone-100 px-3 py-1">
          API mail · {{ providers.mailApi ? t('settings.ready') : t('settings.off') }}
        </span>
      </div>
      <div class="mt-4 flex gap-2">
        <UiButton variant="ghost" :to="localePath('/social/accounts')">{{ t('social.accounts') }}</UiButton>
        <UiButton variant="ghost" :to="localePath('/outreach/settings')">{{ t('outreach.settings') }}</UiButton>
        <UiButton variant="ghost" :to="localePath('/seo/settings')">{{ t('seo.settings') }}</UiButton>
      </div>
    </UiCard>
  </div>
</template>
