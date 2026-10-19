<script setup lang="ts">
import { motion } from 'motion-v'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <AppSidebar />
    <div class="lg:pl-72">
      <AppHeader />
      <main class="px-4 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-8">
        <motion.div
          :key="route.fullPath"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.28 }"
        >
          <slot />
        </motion.div>
      </main>
    </div>
  </div>
</template>
