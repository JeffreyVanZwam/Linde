<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const me = useState<{ user: { role?: string } } | null>('me')
const admin = computed(() => me.value?.user.role === 'admin')
const tab = ref('theme')
const tabs = computed(() => [
  { id: 'theme', label: t('settings.theme') },
  { id: 'connections', label: t('shell.connections') },
  { id: 'storage', label: t('settings.storage') },
  { id: 'account', label: t('settings.profile') },
])
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

const shortcuts = computed(() => [
  { to: '/social/accounts', label: t('social.accounts'), icon: 'solar:share-circle-bold-duotone' },
  { to: '/outreach/settings', label: t('outreach.settings'), icon: 'solar:letter-bold-duotone' },
  { to: '/seo/settings', label: t('seo.settings'), icon: 'solar:document-text-bold-duotone' },
])
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('settings.title')" :lead="t('settings.lead')" />
    <UiTabs v-model="tab" :items="tabs" :label="t('settings.title')" />

    <div v-if="tab === 'theme'" class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.6fr)]">
      <UiCard>
        <h2 class="font-display text-2xl font-semibold tracking-tight">
          {{ t('settings.theme') }}
        </h2>
        <div class="mt-4">
          <AppThemeSwitch />
        </div>
      </UiCard>
      <UiCard tone="ink" class="flex flex-col justify-between">
        <Icon name="solar:palette-bold-duotone" class="size-8" />
        <p class="mt-6 font-display text-2xl font-semibold tracking-tight">
          {{ t('theme.label') }}
        </p>
      </UiCard>
    </div>

    <div v-else-if="tab === 'connections'" class="space-y-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <UiCard>
          <p class="text-xs font-medium text-muted">{{ t('settings.text') }}</p>
          <p class="mt-2 font-display text-3xl font-semibold tracking-tight">
            {{ providers.tier === 'free' ? t('settings.free') : providers.aiProvider }}
          </p>
          <p class="text-sm text-muted">
            {{ providers.model }}
            · {{ providers.tier === 'free' ? t('settings.noKey') : (providers.textReady ? t('settings.ready') : t('settings.missing')) }}
          </p>
        </UiCard>
        <UiCard tone="highlight">
          <p class="text-xs font-medium opacity-80">{{ t('settings.image') }}</p>
          <p class="mt-2 font-display text-3xl font-semibold tracking-tight">
            {{ providers.imageProvider === 'none' ? t('settings.off') : providers.imageProvider }}
          </p>
          <p class="text-sm opacity-80">
            {{ providers.imageReady ? t('settings.ready') : t('settings.missing') }}
          </p>
        </UiCard>
        <UiCard tone="ink" class="flex flex-col justify-between">
          <p class="text-xs font-medium opacity-70">API mail</p>
          <p class="mt-3 font-display text-3xl font-semibold tracking-tight">
            {{ providers.mailApi ? t('settings.ready') : t('settings.off') }}
          </p>
        </UiCard>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="(ready, name) in providers.social"
          :key="name"
          class="rounded-[1.4rem] border border-line bg-surface px-4 py-4"
        >
          <p class="text-sm font-medium capitalize">{{ name }}</p>
          <p class="mt-2 text-xs" :class="ready ? 'text-accent' : 'text-muted'">
            {{ ready ? t('settings.ready') : t('settings.notSet') }}
          </p>
        </div>
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <NuxtLink
          v-for="item in shortcuts"
          :key="item.to"
          :to="localePath(item.to)"
          class="flex items-center gap-3 rounded-[1.4rem] border border-line bg-soft px-4 py-4 text-sm font-medium transition duration-200 hover:-translate-y-0.5"
        >
          <Icon :name="item.icon" class="size-6 text-accent" />
          {{ item.label }}
        </NuxtLink>
      </div>
    </div>

    <UiCard v-else-if="tab === 'storage'">
      <StorageSettings :admin="admin" />
    </UiCard>
    <div v-else>
      <UserSettings :admin="admin" />
    </div>
  </div>
</template>
