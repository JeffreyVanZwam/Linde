<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const chats = await api<Array<{ id: string, title: string, updatedAt: string }>>('/api/conversations?module=strategy')
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
    <p v-if="!chats.length" class="text-sm text-stone-500">
      {{ t('strategy.empty') }}
    </p>
    <div class="grid gap-3">
      <NuxtLink v-for="chat in chats" :key="chat.id" :to="localePath(`/strategy/${chat.id}`)" class="rounded-3xl border border-line bg-white px-5 py-4">
        {{ chat.title }}
      </NuxtLink>
    </div>
  </div>
</template>
