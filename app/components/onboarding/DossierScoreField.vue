<script setup lang="ts">
import type { DossierScore } from '~~/shared/dossier'

const score = defineModel<DossierScore>({ required: true })
defineProps<{ label: string, scoreLabel: string, findingLabel: string }>()

function setScore(raw: string) {
  if (!raw.trim()) {
    score.value = { ...score.value, score: 0 }
    return
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return
  score.value = { ...score.value, score: Math.min(10, Math.max(0, Math.round(parsed))) }
}

function setNote(note: string) {
  score.value = { ...score.value, note }
}
</script>

<template>
  <div class="grid gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[8.5rem_1fr]">
    <label class="block space-y-1.5 text-sm">
      <span class="font-medium text-ink">{{ scoreLabel }}</span>
      <input
        :value="score.score"
        type="number"
        min="0"
        max="10"
        inputmode="numeric"
        class="w-full rounded-2xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-contrast focus:ring-2 focus:ring-contrast"
        @input="setScore(($event.target as HTMLInputElement).value)"
      >
    </label>
    <UiField :label="label">
      <UiTextarea :model-value="score.note" :rows="3" :placeholder="findingLabel" @update:model-value="setNote" />
    </UiField>
  </div>
</template>
