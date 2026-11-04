<script setup lang="ts">
const route = useRoute()
const wide = computed(() => route.path.includes('/onboarding'))
</script>

<template>
  <div class="min-h-dvh bg-canvas px-3 py-4 text-ink sm:px-4">
    <div
      class="mx-auto flex min-h-[calc(100dvh-2rem)] flex-col rounded-[1.6rem] border border-line bg-paper px-5 py-6 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.55)] sm:px-8"
      :class="wide ? 'max-w-6xl' : 'max-w-3xl'"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <AppMark inverted class="size-7" />
          <p class="font-display text-2xl font-semibold tracking-tight">
            {{ $t('app.name') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <BrandSwitcher plain class="w-56" />
          <AppLocaleSwitch />
        </div>
      </div>
      <div class="mt-8">
        <slot />
      </div>
    </div>
  </div>
</template>
