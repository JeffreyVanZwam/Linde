<script setup lang="ts">
import { motion } from 'motion-v'

const route = useRoute()
const reduceMotion = ref(false)

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-paper text-ink">
    <AppSidebar />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppHeader />
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-[max(4.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10">
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
</template>
