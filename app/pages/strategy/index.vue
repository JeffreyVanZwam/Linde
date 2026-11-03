<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('strategy.title')" :lead="t('strategy.lead')" />
    <div class="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <NuxtLink
        :to="localePath('/strategy/new')"
        class="flex min-h-52 flex-col justify-between rounded-[1.6rem] bg-cta p-5 text-cta-ink transition duration-200 hover:-translate-y-0.5"
      >
        <Icon name="solar:add-circle-bold-duotone" class="size-8" />
        <span>
          <span class="block font-display text-3xl font-semibold tracking-tight">{{ t('strategy.new') }}</span>
          <span class="mt-2 block text-sm opacity-80">{{ t('strategy.lead') }}</span>
        </span>
      </NuxtLink>
      <ChatList module="strategy" tiles :empty="t('strategy.empty')" />
    </div>
  </div>
</template>
