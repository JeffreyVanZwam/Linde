<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-5xl">
          {{ t('strategy.title') }}
        </h1>
        <p class="mt-3 max-w-2xl text-stone-600">
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
