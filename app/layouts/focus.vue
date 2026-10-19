<template>
  <div class="min-h-screen bg-paper px-4 py-8 text-ink">
    <div class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <AppMark class="size-9 text-accent" />
        <p class="font-serif text-2xl">
          {{ $t('app.name') }}
        </p>
      </div>
      <AppLocaleSwitch />
    </div>
    <div class="mx-auto mt-8 max-w-3xl">
      <slot />
    </div>
  </div>
</template>
