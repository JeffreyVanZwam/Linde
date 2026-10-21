<script setup lang="ts">
const open = useState('nav-open', () => false)
const { t } = useI18n()
const me = useState<{ user: { name: string } } | null>('me')
const initial = computed(() => me.value?.user.name?.trim().charAt(0).toUpperCase() || '')
</script>

<template>
  <header class="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
    <button
      class="flex size-11 shrink-0 items-center justify-center rounded-full bg-sidebar text-sidebar-ink transition active:scale-95 lg:hidden"
      type="button"
      :aria-label="t('nav.menu')"
      @click="open = !open"
    >
      <Icon :name="open ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'" class="size-5" />
    </button>
    <AppSectionNav class="order-last w-full lg:order-none lg:w-auto lg:flex-1" />
    <div class="ml-auto flex items-center gap-2">
      <AppLocaleSwitch />
      <p v-if="me?.user.name" class="flex items-center gap-2 rounded-full bg-soft py-1 pl-1 pr-3 text-sm">
        <span class="flex size-8 items-center justify-center rounded-full bg-cta text-xs font-semibold text-cta-ink">
          {{ initial }}
        </span>
        <span class="hidden max-w-36 truncate sm:inline">{{ me.user.name }}</span>
      </p>
    </div>
  </header>
</template>
