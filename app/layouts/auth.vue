<script setup lang="ts">
import { motion } from 'motion-v'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink px-4 py-10 text-ink">
    <div class="absolute right-4 top-4">
      <AppLocaleSwitch tone="dark" />
    </div>
    <motion.div
      class="mt-10 w-full max-w-md rounded-[2rem] bg-paper p-6 shadow-2xl sm:p-8"
      :initial="{ opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }"
    >
      <div class="mb-6 flex items-center gap-3">
        <AppMark class="size-10 text-accent" />
        <p class="font-serif text-3xl">
          {{ $t('app.name') }}
        </p>
      </div>
      <slot />
    </motion.div>
  </div>
</template>
