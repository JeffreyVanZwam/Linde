<script setup lang="ts">
import { motion } from 'motion-v'

const route = useRoute()
const reduceMotion = ref(false)

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<template>
  <div class="min-h-dvh bg-canvas p-2 text-ink sm:p-3 lg:p-4">
    <div class="flex min-h-[calc(100dvh-1rem)] overflow-visible rounded-[1.6rem] border border-line bg-paper shadow-[0_28px_80px_-40px_rgba(0,0,0,0.55)] sm:min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-2rem)] lg:overflow-hidden">
      <AppSidebar />
      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main class="min-w-0 flex-1 px-4 pb-[max(4.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10">
          <motion.div
            :key="route.fullPath"
            :initial="reduceMotion ? false : { opacity: 0, y: 12 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }"
          >
            <slot />
          </motion.div>
        </main>
      </div>
    </div>
  </div>
</template>
