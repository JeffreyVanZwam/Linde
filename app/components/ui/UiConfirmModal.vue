<script setup lang="ts">
import { motion } from 'motion-v'

const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  busyLabel?: string
  progress?: string
}>(), {
  busy: false,
  busyLabel: '',
  progress: '',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const titleId = useId()
const messageId = useId()
const panel = ref<HTMLElement | null>(null)

function close() {
  if (props.busy) return
  emit('cancel')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  panel.value?.focus()
})

onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <motion.div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      @click.self="close"
    >
      <motion.div
        class="w-full max-w-md"
        :initial="{ y: 16, opacity: 0 }"
        :animate="{ y: 0, opacity: 1 }"
      >
        <div
          ref="panel"
          tabindex="-1"
          class="rounded-3xl border border-line bg-surface p-6 shadow-lg outline-none"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
        <h2 :id="titleId" class="font-display text-3xl font-semibold tracking-tight">
          {{ title }}
        </h2>
        <p :id="messageId" class="mt-2 text-sm text-muted">
          {{ message }}
        </p>
        <p v-if="busy && progress" class="mt-2 text-sm text-muted">
          {{ progress }}
        </p>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <UiButton variant="ghost" :disabled="busy" @click="close">
            {{ cancelLabel }}
          </UiButton>
          <UiButton variant="danger" :disabled="busy" @click="emit('confirm')">
            {{ busy ? (busyLabel || confirmLabel) : confirmLabel }}
          </UiButton>
        </div>
        </div>
      </motion.div>
    </motion.div>
  </Teleport>
</template>
