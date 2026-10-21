<template>
  <div class="min-h-dvh bg-canvas px-3 py-4 text-ink sm:px-4">
    <div class="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-3xl flex-col rounded-[1.6rem] border border-line bg-paper px-5 py-6 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.55)] sm:px-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-11 items-center justify-center rounded-full bg-sidebar">
            <AppMark class="size-7 text-sidebar-ink" />
          </span>
          <p class="font-display text-2xl font-semibold tracking-tight">
            {{ $t('app.name') }}
          </p>
        </div>
        <AppLocaleSwitch />
      </div>
      <div class="mt-8">
        <slot />
      </div>
    </div>
  </div>
</template>
