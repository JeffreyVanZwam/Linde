<script setup lang="ts">
import { motion } from 'motion-v'

type Folder = { id: string, name: string, parentId?: string | null }
type LibraryFile = { id: string, name: string, mime: string, kind: string, source: string, size: number, image: boolean }
type Library = {
  folderId: string | null
  breadcrumb: Array<{ id: string, name: string }>
  folders: Array<{ id: string, name: string }>
  files: LibraryFile[]
  allFolders: Folder[]
}

const { t } = useI18n()
const route = useRoute()
const api = useRequestFetch()
const folder = computed(() => typeof route.query.folder === 'string' ? route.query.folder : '')
const { data, refresh, error } = await useAsyncData('library', () => api<Library>('/api/library', {
  query: folder.value ? { folder: folder.value } : {},
}), { watch: [folder] })

const folderName = ref('')
const busy = ref(false)
const message = ref('')
const editing = ref<{ id: string, kind: 'folder' | 'file', name: string } | null>(null)
const moving = ref<{ id: string, kind: 'folder' | 'file', folderId: string } | null>(null)
const removing = ref<{ id: string, kind: 'folder' | 'file' } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function openFolder(id?: string) {
  await navigateTo({ query: id ? { folder: id } : {} })
}

async function createFolder() {
  const name = folderName.value.trim()
  if (!name) return
  busy.value = true
  message.value = ''
  try {
    await api('/api/library/folders', {
      method: 'POST',
      body: { name, parentId: folder.value || null },
    })
    folderName.value = ''
    await refresh()
  }
  catch (cause) {
    message.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])]
  if (!files.length) return
  busy.value = true
  message.value = ''
  try {
    for (const file of files) {
      const body = new FormData()
      body.set('file', file)
      await api('/api/library/files', {
        method: 'POST',
        query: folder.value ? { folder: folder.value } : {},
        body,
      })
    }
    await refresh()
  }
  catch (cause) {
    message.value = errorText(cause) || t('common.error')
  }
  input.value = ''
  busy.value = false
}

async function saveName() {
  if (!editing.value) return
  busy.value = true
  const current = editing.value
  try {
    const path = current.kind === 'folder' ? `/api/library/folders/${current.id}` : `/api/library/files/${current.id}`
    await api(path, { method: 'PATCH', body: { name: current.name.trim() } })
    editing.value = null
    await refresh()
  }
  catch (cause) {
    message.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

async function saveMove() {
  if (!moving.value) return
  busy.value = true
  const current = moving.value
  const parentId = current.folderId || null
  try {
    const path = current.kind === 'folder' ? `/api/library/folders/${current.id}` : `/api/library/files/${current.id}`
    const body = current.kind === 'folder' ? { parentId } : { folderId: parentId }
    await api(path, { method: 'PATCH', body })
    moving.value = null
    await refresh()
  }
  catch (cause) {
    message.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

async function confirmRemove() {
  if (!removing.value) return
  busy.value = true
  const current = removing.value
  try {
    const path = current.kind === 'folder' ? `/api/library/folders/${current.id}` : `/api/library/files/${current.id}`
    await api(path, { method: 'DELETE' })
    removing.value = null
    await refresh()
  }
  catch (cause) {
    message.value = errorText(cause) || t('common.error')
  }
  busy.value = false
}

function destinationOptions(kind: 'folder' | 'file', id: string) {
  return (data.value?.allFolders || []).filter(item => kind === 'file' || item.id !== id)
}

onMounted(async () => {
  const pb = useNuxtApp().$pb
  const token = useCookie('pb_auth').value
  if (!token) return
  pb.authStore.save(token)
  let pending = 0
  const schedule = () => {
    window.clearTimeout(pending)
    pending = window.setTimeout(() => refresh(), 150)
  }
  try {
    await pb.collection('folders').subscribe('*', schedule)
    await pb.collection('library_files').subscribe('*', schedule)
  }
  catch {
    // De lijst blijft werken via de API als de live verbinding ontbreekt.
  }
})

onBeforeUnmount(() => {
  const pb = useNuxtApp().$pb
  pb.collection('folders').unsubscribe('*')
  pb.collection('library_files').unsubscribe('*')
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('files.title') }}
      </h1>
      <p class="mt-3 max-w-2xl text-stone-600">
        {{ t('files.lead') }}
      </p>
    </div>
    <nav class="flex flex-wrap items-center gap-2 text-sm text-stone-600">
      <button type="button" class="font-medium text-accent" @click="openFolder()">
        {{ t('files.root') }}
      </button>
      <template v-for="crumb in data?.breadcrumb || []" :key="crumb.id">
        <span>/</span>
        <button type="button" class="font-medium text-accent" @click="openFolder(crumb.id)">
          {{ crumb.name }}
        </button>
      </template>
    </nav>
    <form class="flex flex-wrap items-end gap-3" @submit.prevent="createFolder">
      <UiField :label="t('files.folderName')" class="min-w-56 flex-1">
        <UiInput v-model="folderName" :placeholder="t('files.newFolder')" />
      </UiField>
      <UiButton type="submit" :disabled="busy || !folderName.trim()">
        {{ t('files.newFolder') }}
      </UiButton>
      <UiButton type="button" variant="ghost" :disabled="busy" @click="fileInput?.click()">
        {{ t('files.upload') }}
      </UiButton>
      <input ref="fileInput" class="hidden" type="file" multiple @change="upload">
    </form>
    <UiAlert :message="message || (error ? t('common.error') : '')" />
    <p v-if="removing" class="flex flex-wrap items-center gap-3 rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-800">
      {{ removing.kind === 'folder' ? t('files.deleteFolder') : t('files.deleteFile') }}
      <UiButton variant="danger" :disabled="busy" @click="confirmRemove">
        {{ t('files.delete') }}
      </UiButton>
      <UiButton variant="ghost" @click="removing = null">
        {{ t('files.cancel') }}
      </UiButton>
    </p>
    <form v-if="editing" class="flex flex-wrap items-end gap-3" @submit.prevent="saveName">
      <UiField :label="t('files.rename')" class="min-w-56 flex-1">
        <UiInput v-model="editing.name" required />
      </UiField>
      <UiButton type="submit" :disabled="busy">
        {{ t('common.save') }}
      </UiButton>
      <UiButton type="button" variant="ghost" @click="editing = null">
        {{ t('files.cancel') }}
      </UiButton>
    </form>
    <form v-if="moving" class="flex flex-wrap items-end gap-3" @submit.prevent="saveMove">
      <UiField :label="t('files.move')" class="min-w-56 flex-1">
        <select v-model="moving.folderId" class="w-full rounded-2xl border border-line bg-white px-3 py-3 text-sm">
          <option value="">
            {{ t('files.rootOption') }}
          </option>
          <option v-for="item in destinationOptions(moving.kind, moving.id)" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select>
      </UiField>
      <UiButton type="submit" :disabled="busy">
        {{ t('common.save') }}
      </UiButton>
      <UiButton type="button" variant="ghost" @click="moving = null">
        {{ t('files.cancel') }}
      </UiButton>
    </form>
    <div v-if="!(data?.folders.length || data?.files.length)" class="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-stone-500">
      {{ t('files.empty') }}
    </div>
    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <motion.article
        v-for="item in data?.folders || []"
        :key="item.id"
        class="flex flex-col rounded-3xl border border-line bg-white p-3"
        :initial="{ opacity: 0, y: 6 }"
        :animate="{ opacity: 1, y: 0 }"
      >
        <button type="button" class="flex flex-1 flex-col gap-3 text-left" @click="openFolder(item.id)">
          <span class="flex aspect-square items-center justify-center rounded-2xl bg-stone-100">
            <Icon name="solar:folder-bold-duotone" class="!size-16 text-accent" />
          </span>
          <span class="truncate text-sm font-medium">{{ item.name }}</span>
        </button>
        <div class="mt-3 flex gap-2 text-xs">
          <button type="button" class="text-stone-500" @click="editing = { id: item.id, kind: 'folder', name: item.name }">
            {{ t('files.rename') }}
          </button>
          <button type="button" class="text-stone-500" @click="moving = { id: item.id, kind: 'folder', folderId: '' }">
            {{ t('files.move') }}
          </button>
          <button type="button" class="text-red-700" @click="removing = { id: item.id, kind: 'folder' }">
            {{ t('files.delete') }}
          </button>
        </div>
      </motion.article>
      <motion.article
        v-for="file in data?.files || []"
        :key="file.id"
        class="flex flex-col rounded-3xl border border-line bg-white p-3"
        :initial="{ opacity: 0, y: 6 }"
        :animate="{ opacity: 1, y: 0 }"
      >
        <a :href="`/api/media/${file.id}`" class="flex flex-1 flex-col gap-3" target="_blank">
          <img v-if="file.image" :src="`/api/media/${file.id}?thumb=200x200`" alt="" class="aspect-square w-full rounded-2xl object-cover">
          <span v-else class="flex aspect-square items-center justify-center rounded-2xl bg-stone-100">
            <Icon :name="fileIcon(file.mime)" class="!size-16 text-accent" />
          </span>
          <span class="truncate text-sm font-medium">{{ file.name }}</span>
          <span v-if="file.source === 'brand' || file.source === 'brain'" class="text-xs uppercase tracking-[0.16em] text-stone-400">
            {{ t('files.brain') }}
          </span>
        </a>
        <div class="mt-3 flex gap-2 text-xs">
          <button type="button" class="text-stone-500" @click="editing = { id: file.id, kind: 'file', name: file.name }">
            {{ t('files.rename') }}
          </button>
          <button type="button" class="text-stone-500" @click="moving = { id: file.id, kind: 'file', folderId: folder }">
            {{ t('files.move') }}
          </button>
          <button type="button" class="text-red-700" @click="removing = { id: file.id, kind: 'file' }">
            {{ t('files.delete') }}
          </button>
        </div>
      </motion.article>
    </div>
  </div>
</template>
