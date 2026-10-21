<script setup lang="ts">
const props = defineProps<{ to: string }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath(props.to)"
    class="group inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-medium text-muted transition hover:text-ink"
  >
    <span class="flex size-11 items-center justify-center rounded-full border border-line bg-surface transition duration-200 group-hover:-translate-x-0.5">
      <Icon name="solar:alt-arrow-left-bold-duotone" class="size-5" />
    </span>
    {{ t('common.back') }}
  </NuxtLink>
</template>
