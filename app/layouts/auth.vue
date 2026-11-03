<script setup lang="ts">
import { motion } from 'motion-v'

const reduceMotion = ref(false)
onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<template>
  <div class="grid min-h-dvh bg-canvas text-ink lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1fr)]">
    <div class="panel-ink relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
      <div class="flex items-center gap-3">
        <AppMark inverted class="size-8" />
        <p class="font-display text-2xl font-semibold tracking-tight">
          {{ $t('app.name') }}
        </p>
      </div>
      <div>
        <p class="max-w-sm font-display text-5xl font-semibold tracking-tight">
          {{ $t('nav.dashboard') }}
        </p>
        <p class="mt-4 max-w-sm text-base opacity-80">
          {{ $t('home.lead') }}
        </p>
      </div>
      <div class="flex gap-2">
        <span class="size-10 rounded-2xl bg-cta" />
        <span class="size-10 rounded-2xl bg-white/20" />
        <span class="size-10 rounded-2xl bg-white/10" />
      </div>
    </div>
    <div class="relative flex items-center justify-center px-4 py-16">
      <div class="absolute right-4 top-4">
        <AppLocaleSwitch />
      </div>
      <motion.div
        class="w-full max-w-md rounded-[2rem] border border-line bg-surface p-6 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.55)] sm:p-8"
        :initial="reduceMotion ? false : { opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="mb-6 flex items-center gap-3 lg:hidden">
          <AppMark inverted class="size-8" />
          <p class="font-display text-3xl font-semibold tracking-tight">
            {{ $t('app.name') }}
          </p>
        </div>
        <slot />
      </motion.div>
    </div>
  </div>
</template>
