<script setup lang="ts">
const me = useState<{ user: { name: string } } | null>('me')
</script>

<template>
  <header class="flex flex-wrap items-center justify-end gap-2 px-4 py-3 pl-16 sm:gap-3 sm:px-8 lg:pl-8">
    <AppLocaleSwitch />
    <p class="hidden max-w-40 truncate text-sm text-stone-600 sm:block">
      {{ me?.user.name }}
    </p>
  </header>
</template>
