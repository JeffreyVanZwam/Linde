<script setup lang="ts">
const { t } = useI18n()
const deferred = ref<Event & { prompt: () => Promise<void> } | null>(null)

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred.value = event as Event & { prompt: () => Promise<void> }
  })
})

async function install() {
  if (!deferred.value) return
  await deferred.value.prompt()
  deferred.value = null
}
</script>

<template>
  <button
    v-if="deferred"
    type="button"
    class="mb-2 flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-white/10"
    @click="install"
  >
    <Icon name="solar:download-minimalistic-bold-duotone" class="size-5" />
    {{ t('pwa.install') }}
  </button>
</template>
