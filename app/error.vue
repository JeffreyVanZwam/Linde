<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

if (props.error.statusCode === 401) {
  useState('me').value = null
  useState('me-loaded').value = false
}

const next = props.error.statusCode === 401 ? '/login' : '/'
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-canvas px-6 text-ink">
    <p class="font-display text-5xl font-semibold tracking-tight">
      {{ error.statusCode || 500 }}
    </p>
    <p class="mt-3 text-muted">
      {{ error.statusMessage || error.message }}
    </p>
    <a :href="next" class="mt-6 inline-flex min-h-11 w-fit items-center rounded-full bg-cta px-4 py-2 text-sm text-cta-ink">
      {{ error.statusCode === 401 ? 'Inloggen' : 'Home' }}
    </a>
  </div>
</template>
