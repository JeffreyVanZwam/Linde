<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-5xl font-semibold tracking-tight">
          {{ t('strategy.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-muted">
          {{ t('strategy.lead') }}
        </p>
      </div>
      <UiButton :to="localePath('/strategy/new')">
        {{ t('strategy.new') }}
      </UiButton>
    </div>
    <ChatList module="strategy" :empty="t('strategy.empty')" />
  </div>
</template>
