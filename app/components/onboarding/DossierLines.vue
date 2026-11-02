<script setup lang="ts">
const lines = defineModel<string[]>({ required: true })
defineProps<{ addLabel: string, removeLabel: string }>()

function add() {
  lines.value = [...lines.value, '']
}

function update(index: number, value: string) {
  lines.value = lines.value.map((line, lineIndex) => lineIndex === index ? value : line)
}

function remove(index: number) {
  lines.value = lines.value.filter((_, lineIndex) => lineIndex !== index)
}
</script>

<template>
  <div class="space-y-2">
    <div v-for="(line, index) in lines" :key="index" class="flex items-start gap-2">
      <UiInput class="min-w-0 flex-1" :model-value="line" @update:model-value="update(index, $event)" />
      <UiButton variant="ghost" type="button" @click="remove(index)">
        {{ removeLabel }}
      </UiButton>
    </div>
    <UiButton variant="ghost" type="button" @click="add">
      {{ addLabel }}
    </UiButton>
  </div>
</template>
