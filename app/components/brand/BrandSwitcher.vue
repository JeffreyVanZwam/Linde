<script setup lang="ts">
type BrandChip = {
  id: string
  companyName: string | null
  color: string
  archived: boolean
  onboardingCompleted: boolean
}

const props = withDefaults(defineProps<{ plain?: boolean }>(), { plain: false })
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const open = ref(false)
const creating = ref(false)
const name = ref('')
const confirmName = ref('')
const removing = ref<BrandChip | null>(null)
const error = ref('')
const brands = ref<BrandChip[]>([])
const activeId = ref('')

async function load() {
  const me = await api<{ brand: { id: string } | null, brands: BrandChip[] }>('/api/me')
  brands.value = me.brands || []
  activeId.value = me.brand?.id || ''
}

await load()

const active = computed(() => brands.value.find(brand => brand.id === activeId.value) || null)
const visible = computed(() => brands.value.filter(brand => !brand.archived))
const archivedBrands = computed(() => brands.value.filter(brand => brand.archived))

async function choose(id: string) {
  error.value = ''
  await api('/api/brands/active', { method: 'POST', body: { id } })
  const brand = brands.value.find(item => item.id === id)
  window.location.assign(localePath(brand?.onboardingCompleted ? '/' : '/onboarding'))
}

async function create() {
  if (!name.value.trim()) return
  creating.value = true
  error.value = ''
  try {
    await api('/api/brands', { method: 'POST', body: { companyName: name.value.trim() } })
    window.location.assign(localePath('/onboarding'))
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
    creating.value = false
  }
}

async function archive(brand: BrandChip, archived: boolean) {
  error.value = ''
  try {
    await api(`/api/brands/${brand.id}`, { method: 'PATCH', body: { archived } })
    if (archived && brand.id === activeId.value) {
      window.location.assign(localePath('/'))
      return
    }
    await load()
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function move(index: number, direction: number) {
  const next = [...visible.value]
  const target = index + direction
  const current = next[index]
  const other = next[target]
  if (!current || !other) return
  next[index] = other
  next[target] = current
  await api('/api/brands/reorder', { method: 'POST', body: { ids: next.map(brand => brand.id) } })
  await load()
}

async function remove() {
  if (!removing.value) return
  error.value = ''
  try {
    await api(`/api/brands/${removing.value.id}`, { method: 'DELETE', body: { confirm: confirmName.value } })
    window.location.assign(localePath('/'))
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition"
      :class="props.plain ? 'border border-line bg-surface text-ink hover:bg-soft' : 'text-sidebar-ink hover:bg-white/10'"
      :aria-expanded="open"
      :aria-label="t('brands.switch')"
      @click="open = !open"
    >
      <span class="size-3 shrink-0 rounded-full" :style="{ background: active?.color || '#1F6B4A' }" />
      <span class="min-w-0 flex-1 truncate">{{ active?.companyName || t('brands.label') }}</span>
      <Icon name="solar:alt-arrow-down-linear" class="size-4 shrink-0 opacity-70" />
    </button>
    <div v-if="open" class="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-auto rounded-2xl border p-2 shadow-xl" :class="props.plain ? 'border-line bg-surface text-ink' : 'border-white/10 bg-sidebar text-sidebar-ink'">
      <div v-for="(brand, index) in visible" :key="brand.id" class="flex items-center gap-1">
        <button type="button" class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left text-sm hover:bg-black/5" @click="choose(brand.id)">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: brand.color }" />
          <span class="truncate">{{ brand.companyName || t('brands.label') }}</span>
        </button>
        <button type="button" class="inline-flex size-8 items-center justify-center opacity-70" :disabled="index === 0" @click="move(index, -1)">
          <Icon name="solar:alt-arrow-up-linear" class="size-4" />
        </button>
        <button type="button" class="inline-flex size-8 items-center justify-center opacity-70" :aria-label="t('brands.archive')" @click="archive(brand, true)">
          <Icon name="solar:archive-linear" class="size-4" />
        </button>
        <button type="button" class="inline-flex size-8 items-center justify-center opacity-70" :aria-label="t('brands.delete')" @click="removing = brand; confirmName = ''">
          <Icon name="solar:trash-bin-trash-linear" class="size-4" />
        </button>
      </div>
      <div v-if="archivedBrands.length" class="mt-2 border-t border-current/15 pt-2">
        <p class="px-2 pb-1 text-xs uppercase tracking-wide opacity-70">{{ t('brands.archived') }}</p>
        <div v-for="brand in archivedBrands" :key="brand.id" class="flex items-center gap-1">
          <span class="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2 text-sm opacity-70">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ background: brand.color }" />
            <span class="truncate">{{ brand.companyName || t('brands.label') }}</span>
          </span>
          <button type="button" class="inline-flex size-8 items-center justify-center opacity-70" :aria-label="t('brands.restore')" @click="archive(brand, false)">
            <Icon name="solar:restart-linear" class="size-4" />
          </button>
          <button type="button" class="inline-flex size-8 items-center justify-center opacity-70" :aria-label="t('brands.delete')" @click="removing = brand; confirmName = ''">
            <Icon name="solar:trash-bin-trash-linear" class="size-4" />
          </button>
        </div>
      </div>
      <form class="mt-2 flex gap-2" @submit.prevent="create">
        <input v-model="name" class="min-w-0 flex-1 rounded-xl border border-current/15 bg-transparent px-3 py-2 text-sm" :placeholder="t('brands.name')">
        <button type="submit" class="rounded-xl bg-black/5 px-3 text-sm" :disabled="creating">{{ t('brands.new') }}</button>
      </form>
      <form v-if="removing" class="mt-2 space-y-2" @submit.prevent="remove">
        <p class="px-1 text-xs opacity-70">{{ t('brands.confirm') }}: {{ removing.companyName }}</p>
        <input v-model="confirmName" class="w-full rounded-xl border border-current/15 bg-transparent px-3 py-2 text-sm">
        <button type="submit" class="rounded-xl bg-black/5 px-3 py-2 text-sm">{{ t('brands.delete') }}</button>
      </form>
      <p v-if="error" class="mt-2 px-1 text-xs text-red-200">{{ error }}</p>
    </div>
  </div>
</template>
