<script setup lang="ts" generic="T extends Record<string, string>">
const items = defineModel<T[]>({ required: true })
const props = withDefaults(defineProps<{
  columns: { key: keyof T & string, label: string, multiline?: boolean, rows?: number }[]
  addLabel: string
  removeLabel: string
  itemLabel?: string
  fixed?: boolean
}>(), {
  fixed: false,
})

function add() {
  const row = {} as T
  for (const column of props.columns) row[column.key] = '' as T[typeof column.key]
  items.value = [...items.value, row]
}

function update(index: number, key: keyof T & string, value: string) {
  items.value = items.value.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)
}

function remove(index: number) {
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index)
}
</script>

<template>
  <div class="space-y-3">
    <article v-for="(item, index) in items" :key="index" class="rounded-2xl border border-line bg-canvas p-3 sm:p-4">
      <p v-if="itemLabel" class="mb-3 text-sm font-medium text-muted">
        {{ itemLabel }} {{ index + 1 }}
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <UiField
          v-for="column in columns"
          :key="column.key"
          :label="column.label"
          :class="column.multiline ? 'sm:col-span-2' : undefined"
        >
          <UiTextarea
            v-if="column.multiline"
            :model-value="item[column.key] || ''"
            :rows="column.rows || 3"
            @update:model-value="update(index, column.key, $event)"
          />
          <UiInput
            v-else
            :model-value="item[column.key] || ''"
            @update:model-value="update(index, column.key, $event)"
          />
        </UiField>
      </div>
      <div v-if="!fixed" class="mt-3 flex justify-end">
        <UiButton variant="ghost" type="button" @click="remove(index)">
          {{ removeLabel }}
        </UiButton>
      </div>
    </article>
    <UiButton v-if="!fixed" variant="ghost" type="button" @click="add">
      {{ addLabel }}
    </UiButton>
  </div>
</template>
