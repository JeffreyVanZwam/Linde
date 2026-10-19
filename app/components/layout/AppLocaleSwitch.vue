<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const flags: Record<string, string> = {
  nl: 'emojione-v1:flag-for-netherlands',
  en: 'emojione-v1:flag-for-united-states',
}

function codeOf(item: string | { code: string }) {
  return typeof item === 'string' ? item : item.code
}

function nameOf(item: string | { code: string, name?: string }) {
  if (typeof item === 'string') return item.toUpperCase()
  return item.name || item.code.toUpperCase()
}
</script>

<template>
  <div class="flex gap-1 rounded-full p-1" :class="tone === 'dark' ? 'bg-white/10' : 'bg-white'">
    <NuxtLink
      v-for="item in locales"
      :key="codeOf(item)"
      :to="switchLocalePath(codeOf(item) as 'nl' | 'en')"
      class="flex size-8 items-center justify-center rounded-full"
      :class="locale === codeOf(item) ? (tone === 'dark' ? 'bg-white' : 'bg-ink/10') : ''"
      :aria-label="nameOf(item)"
      :aria-current="locale === codeOf(item) ? 'true' : undefined"
    >
      <Icon :name="flags[codeOf(item)]" mode="svg" class="size-5" />
    </NuxtLink>
  </div>
</template>
