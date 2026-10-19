<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  to?: string
  href?: string
}>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
})

const classes = computed(() => {
  const base = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
  if (props.variant === 'ghost') return `${base} border border-line bg-white hover:bg-stone-50`
  if (props.variant === 'danger') return `${base} bg-red-700 text-white hover:bg-red-800`
  return `${base} bg-accent text-white hover:bg-accent-2`
})
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="[classes, disabled && 'pointer-events-none opacity-50']">
    <slot />
  </NuxtLink>
  <a v-else-if="href" :href="href" :class="classes">
    <slot />
  </a>
  <button v-else :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
