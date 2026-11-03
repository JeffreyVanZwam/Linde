<script setup lang="ts">
import { platformIcons, type ConnectProvider } from '~~/shared/platforms'

const props = withDefaults(defineProps<{
  provider: ConnectProvider
  size?: 'xs' | 'sm' | 'md'
}>(), {
  size: 'md',
})

const box = { xs: 'size-6', sm: 'size-10', md: 'size-12' }
const icon = { xs: '!size-6', sm: '!size-10', md: '!size-12' }

const icons = platformIcons
</script>

<template>
  <span class="flex items-center justify-center" :class="box[props.size]" aria-hidden="true">
    <Icon :name="icons[provider]" mode="svg" :class="icon[props.size]" />
  </span>
</template>
