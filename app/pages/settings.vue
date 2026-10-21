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
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-5xl font-semibold tracking-tight">
        {{ t('settings.title') }}
      </h1>
      <p class="mt-3 max-w-2xl text-muted">
        {{ t('settings.lead') }}
      </p>
    </div>
    <section class="space-y-3">
      <h2 class="font-display text-2xl font-semibold tracking-tight">
        {{ t('settings.theme') }}
      </h2>
      <AppThemeSwitch />
    </section>
    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard>
        <p class="text-xs font-medium text-muted">
          {{ t('settings.text') }}
        </p>
        <p class="mt-2 font-display text-3xl font-semibold tracking-tight">
          {{ providers.tier === 'free' ? t('settings.free') : providers.aiProvider }}
        </p>
        <p class="text-sm text-muted">
          {{ providers.model }}
          · {{ providers.tier === 'free' ? t('settings.noKey') : (providers.textReady ? t('settings.ready') : t('settings.missing')) }}
        </p>
      </UiCard>
      <UiCard>
        <p class="text-xs font-medium text-muted">
          {{ t('settings.image') }}
        </p>
        <p class="mt-2 font-display text-3xl font-semibold tracking-tight">
          {{ providers.imageProvider === 'none' ? t('settings.off') : providers.imageProvider }}
        </p>
        <p class="text-sm text-muted">
          {{ providers.imageReady ? t('settings.ready') : t('settings.missing') }}
        </p>
      </UiCard>
    </div>
    <UiCard>
      <div class="flex flex-wrap gap-2 text-sm">
        <span
          v-for="(ready, name) in providers.social"
          :key="name"
          class="rounded-full px-3 py-1"
          :class="ready ? 'bg-contrast text-contrast-ink' : 'bg-soft text-muted'"
        >
          {{ name }} · {{ ready ? t('settings.ready') : t('settings.notSet') }}
        </span>
        <span class="rounded-full px-3 py-1" :class="providers.mailApi ? 'bg-contrast text-contrast-ink' : 'bg-soft text-muted'">
          API mail · {{ providers.mailApi ? t('settings.ready') : t('settings.off') }}
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton variant="ghost" :to="localePath('/social/accounts')">
          {{ t('social.accounts') }}
        </UiButton>
        <UiButton variant="ghost" :to="localePath('/outreach/settings')">
          {{ t('outreach.settings') }}
        </UiButton>
        <UiButton variant="ghost" :to="localePath('/seo/settings')">
          {{ t('seo.settings') }}
        </UiButton>
      </div>
    </UiCard>
    <StorageSettings :admin="admin" />
    <UserSettings :admin="admin" />
  </div>
</template>
