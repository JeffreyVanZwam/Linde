<script setup lang="ts">
import { motion } from 'motion-v'

const props = defineProps<{
  options: Array<{ externalId: string, displayName: string, authorType: 'person' | 'organization', platform?: string }>
  busy?: boolean
}>()

const emit = defineEmits<{
  select: [externalId: string]
  cancel: []
}>()

const { t } = useI18n()

function kind(option: { authorType: 'person' | 'organization', platform?: string }) {
  if (option.platform === 'instagram') return 'Instagram'
  if (option.authorType === 'organization') return t('social.linkedinPage')
  return t('social.linkedinProfile')
}
const selected = ref(props.options[0]?.externalId || '')

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.busy) emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <motion.div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    role="presentation"
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    @click.self="busy ? undefined : emit('cancel')"
  >
    <motion.div
      class="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="linkedin-choice-title"
      :initial="{ y: 16, opacity: 0 }"
      :animate="{ y: 0, opacity: 1 }"
    >
      <h2 id="linkedin-choice-title" class="font-display font-semibold tracking-tight text-3xl">
        {{ t('social.linkedinChooseTitle') }}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {{ t('social.linkedinChooseLead') }}
      </p>
      <div class="mt-5 space-y-2">
        <label
          v-for="option in options"
          :key="`${option.platform || 'account'}-${option.externalId}`"
          class="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 has-[:checked]:border-accent"
        >
          <input v-model="selected" class="mt-1" type="radio" name="linkedin-account" :value="option.externalId">
          <span>
            <span class="block text-xs uppercase tracking-wide text-muted">
              {{ kind(option) }}
            </span>
            <span class="block font-medium">{{ option.displayName }}</span>
          </span>
        </label>
      </div>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <UiButton variant="ghost" :disabled="busy" @click="emit('cancel')">
          {{ t('social.linkedinChooseCancel') }}
        </UiButton>
        <UiButton :disabled="busy || !selected" @click="emit('select', selected)">
          {{ t('social.linkedinChooseConfirm') }}
        </UiButton>
      </div>
    </motion.div>
  </motion.div>
</template>
