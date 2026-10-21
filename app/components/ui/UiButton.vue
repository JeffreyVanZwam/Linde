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
  const base = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'
  if (props.variant === 'ghost') return `${base} border border-line bg-surface text-ink hover:bg-soft`
  if (props.variant === 'danger') return `${base} bg-red-700 text-white hover:bg-red-800`
  return `${base} bg-cta text-cta-ink`
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
