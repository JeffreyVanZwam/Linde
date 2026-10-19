<script setup lang="ts">
import { themeIds, themes } from '~~/shared/themes'

const { t } = useI18n()
const { id, set } = useTheme()
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3" role="listbox" :aria-label="t('theme.label')">
    <button
      v-for="item in themeIds"
      :key="item"
      type="button"
      role="option"
      class="rounded-2xl border p-2.5 text-left transition"
      :class="id === item ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''"
      :style="{ background: themes[item].paper, borderColor: themes[item].line }"
      :aria-label="t(`theme.${item}`)"
      :aria-selected="id === item"
      @click="set(item)"
    >
      <span class="flex h-16 gap-2" aria-hidden="true">
        <span class="w-3.5 shrink-0 rounded-md" :style="{ background: themes[item].accent }" />
        <span class="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <span class="h-2 w-2/3 rounded-full" :style="{ background: themes[item].accent2 }" />
          <span class="h-1.5 w-full rounded-full" :style="{ background: themes[item].line }" />
          <span class="h-1.5 w-4/5 rounded-full" :style="{ background: themes[item].line }" />
          <span class="mt-1 h-3.5 w-8 rounded-full" :style="{ background: themes[item].accent }" />
        </span>
      </span>
      <span class="mt-2 block text-xs font-medium" :style="{ color: themes[item].accent }">
        {{ t(`theme.${item}`) }}
      </span>
    </button>
  </div>
</template>
