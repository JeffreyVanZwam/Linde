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
  <div class="rounded-2xl bg-soft p-3">
    <div class="flex items-end justify-between gap-3">
      <p class="text-sm font-medium">
        {{ label }}
      </p>
      <label class="w-16 shrink-0 text-right text-xs text-muted">
        <span class="sr-only">{{ scoreLabel }}</span>
        <input
          :value="score.score"
          type="number"
          min="0"
          max="10"
          inputmode="numeric"
          class="w-full rounded-xl border border-line bg-surface px-2 py-1.5 text-center font-display text-lg font-semibold text-ink outline-none focus:border-contrast focus:ring-2 focus:ring-contrast"
          @input="setScore(($event.target as HTMLInputElement).value)"
        >
      </label>
    </div>
    <UiTextarea class="mt-3" :model-value="score.note" :rows="3" :placeholder="findingLabel" @update:model-value="setNote" />
  </div>
</template>
