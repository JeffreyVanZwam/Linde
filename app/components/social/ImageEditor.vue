<script setup lang="ts">
const props = defineProps<{ src: string }>()
const emit = defineEmits<{ saved: [string] }>()
const { t } = useI18n()

const ready = ref(false)
const brightness = ref(100)
const contrast = ref(100)
const overlay = ref('')
const busy = ref(false)
const error = ref('')
const canvasHost = ref<HTMLElement | null>(null)

onMounted(async () => {
  await import('cropperjs')
  ready.value = true
})

function rotate() {
  const image = canvasHost.value?.querySelector('cropper-image') as { $rotate?: (value: string) => void } | null
  image?.$rotate?.('90deg')
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    const selection = canvasHost.value?.querySelector('cropper-selection') as {
      $toCanvas?: () => Promise<HTMLCanvasElement>
    } | null
    const cropped = await selection?.$toCanvas?.()
    if (!cropped) throw new Error(t('common.error'))
    const out = document.createElement('canvas')
    out.width = cropped.width
    out.height = cropped.height
    const context = out.getContext('2d')
    if (!context) throw new Error(t('common.error'))
    context.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%)`
    context.drawImage(cropped, 0, 0)
    context.filter = 'none'
    if (overlay.value.trim()) {
      context.fillStyle = '#ffffff'
      context.font = `600 ${Math.max(24, Math.round(out.width / 16))}px Outfit, sans-serif`
      context.shadowColor = 'rgba(0,0,0,.45)'
      context.shadowBlur = 12
      context.fillText(overlay.value.trim(), 32, out.height - 48)
    }
    const blob = await new Promise<Blob | null>(resolve => out.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error(t('common.error'))
    const form = new FormData()
    form.set('file', blob, 'edited.png')
    const saved = await $fetch<{ id: string }>('/api/media/upload?source=edited', { method: 'POST', body: form })
    emit('saved', saved.id)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="ready" ref="canvasHost" class="overflow-hidden rounded-3xl bg-stone-900">
      <cropper-canvas class="block h-[420px] w-full" background>
        <cropper-image :src="props.src" alt="" rotatable scalable translatable />
        <cropper-shade hidden />
        <cropper-handle action="select" plain />
        <cropper-selection initial-coverage="0.85" movable resizable>
          <cropper-grid role="grid" covered />
          <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
          <cropper-handle action="n-resize" />
          <cropper-handle action="e-resize" />
          <cropper-handle action="s-resize" />
          <cropper-handle action="w-resize" />
          <cropper-handle action="ne-resize" />
          <cropper-handle action="nw-resize" />
          <cropper-handle action="se-resize" />
          <cropper-handle action="sw-resize" />
        </cropper-selection>
      </cropper-canvas>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <UiField :label="t('editor.brightness')">
        <input v-model.number="brightness" type="range" min="50" max="160" class="w-full">
      </UiField>
      <UiField :label="t('editor.contrast')">
        <input v-model.number="contrast" type="range" min="50" max="160" class="w-full">
      </UiField>
    </div>
    <UiField :label="t('editor.text')">
      <UiInput v-model="overlay" />
    </UiField>
    <div class="flex gap-2">
      <UiButton variant="ghost" @click="rotate">
        {{ t('editor.rotate') }}
      </UiButton>
      <UiButton :disabled="busy" @click="save">
        {{ t('editor.save') }}
      </UiButton>
    </div>
    <UiAlert :message="error" />
  </div>
</template>
