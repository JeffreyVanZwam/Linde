<script setup lang="ts">
import { motion } from 'motion-v'

const reduceMotion = ref(false)
onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-ink">
    <div class="absolute right-4 top-4">
      <AppLocaleSwitch />
    </div>
    <motion.div
      class="mt-10 w-full max-w-md rounded-[2rem] border border-line bg-paper p-6 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.55)] sm:p-8"
      :initial="reduceMotion ? false : { opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="mb-6 flex items-center gap-3">
        <span class="flex size-12 items-center justify-center rounded-full bg-sidebar">
          <AppMark class="size-8 text-sidebar-ink" />
        </span>
        <p class="font-display text-3xl font-semibold tracking-tight">
          {{ $t('app.name') }}
        </p>
      </div>
      <slot />
    </motion.div>
  </div>
</template>
