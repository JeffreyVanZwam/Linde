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
  <div class="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
    <p class="font-serif text-5xl">
      {{ error.statusCode || 500 }}
    </p>
    <p class="mt-3 text-stone-600">
      {{ error.statusMessage || error.message }}
    </p>
    <a :href="next" class="mt-6 inline-flex min-h-11 w-fit items-center rounded-full bg-accent px-4 py-2 text-sm text-white">
      {{ error.statusCode === 401 ? 'Inloggen' : 'Home' }}
    </a>
  </div>
</template>
