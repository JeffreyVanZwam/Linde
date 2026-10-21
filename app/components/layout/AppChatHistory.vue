<script setup lang="ts">
import type { ChatModule } from '~~/shared/platforms'

type ChatSummary = {
  id: string
  title: string
  module: ChatModule
  updatedAt: string
}

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const api = useRequestFetch()
const open = useState('nav-open', () => false)
const version = useState('chat-history-version', () => 0)
const { confirmDelete, deleteChat } = useDeleteChat()

const { data, refresh } = await useAsyncData('chat-history', () => api<ChatSummary[]>('/api/conversations'))

const chats = computed(() => [...(data.value || [])]
  .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  .slice(0, 20))

const menuId = ref('')
const menuStyle = ref({ top: '0px', left: '0px' })
const renamingId = ref('')
const draft = ref('')
const saving = ref(false)
const skipSave = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

function bare(path: string) {
  return path.replace(/^\/en(?=\/|$)/, '') || '/'
}

function chatPath(chat: ChatSummary) {
  if (chat.module === 'strategy') return localePath(`/strategy/${chat.id}`)
  if (chat.module === 'social') return localePath(`/social/chat/${chat.id}`)
  if (chat.module === 'seo') return localePath(`/seo/chat/${chat.id}`)
  return localePath(`/outreach/chat/${chat.id}`)
}

function listPath(module: ChatSummary['module']) {
  if (module === 'strategy') return localePath('/strategy')
  if (module === 'social') return localePath('/social')
  if (module === 'seo') return localePath('/seo')
  return localePath('/outreach')
}

function current(id: string) {
  return bare(route.path).includes(`/${id}`)
}

function toggleMenu(chat: ChatSummary, event: MouseEvent) {
  if (menuId.value === chat.id) {
    menuId.value = ''
    return
  }
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const width = 188
  const height = 132
  const left = Math.min(rect.right + 8, window.innerWidth - width - 8)
  let top = rect.top
  if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8)
  menuStyle.value = { top: `${top}px`, left: `${Math.max(8, left)}px` }
  menuId.value = chat.id
}

function closeMenu() {
  menuId.value = ''
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('[data-chat-menu]')) return
  closeMenu()
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKey)
})

watch([() => route.path, version], () => {
  closeMenu()
  refresh()
})

function view(chat: ChatSummary) {
  closeMenu()
  open.value = false
  navigateTo(chatPath(chat))
}

function startRename(chat: ChatSummary) {
  closeMenu()
  skipSave.value = false
  renamingId.value = chat.id
  draft.value = chat.title
  nextTick(() => document.querySelector<HTMLInputElement>('[data-rename-input]')?.focus())
}

function cancelRename() {
  skipSave.value = true
  renamingId.value = ''
}

async function saveRename(chat: ChatSummary) {
  if (skipSave.value) {
    skipSave.value = false
    return
  }
  if (saving.value || renamingId.value !== chat.id) return
  const title = draft.value.trim()
  renamingId.value = ''
  if (!title || title === chat.title) return
  saving.value = true
  try {
    await api(`/api/conversations/${chat.id}`, { method: 'PATCH', body: { title } })
    version.value += 1
  }
  finally {
    saving.value = false
  }
}

async function remove(chat: ChatSummary) {
  closeMenu()
  if (!confirmDelete()) return
  await deleteChat(chat.id)
  if (current(chat.id)) {
    open.value = false
    await navigateTo(listPath(chat.module))
  }
}

const openChat = computed(() => chats.value.find(chat => chat.id === menuId.value) || null)
</script>

<template>
  <section class="mt-6 flex min-h-0 flex-1 flex-col">
    <p class="flex shrink-0 items-center gap-3 px-3 text-sm font-medium text-sidebar-muted">
      <Icon name="solar:history-bold-duotone" class="size-5 shrink-0" />
      {{ t('nav.history') }}
    </p>
    <div class="history-scroll mt-1.5 min-h-0 flex-1 overflow-y-auto pr-1">
      <p v-if="!chats.length" class="px-3 py-2 text-xs text-sidebar-muted">
        {{ t('chat.empty') }}
      </p>
      <div v-for="chat in chats" :key="chat.id" class="flex items-center gap-1 rounded-xl px-1" :class="current(chat.id) ? 'bg-sidebar-active' : 'hover:bg-white/10'">
        <form v-if="renamingId === chat.id" class="min-w-0 flex-1" @submit.prevent="saveRename(chat)">
          <input
            v-model="draft"
            data-rename-input
            class="w-full rounded-lg bg-white/10 px-2 py-1.5 text-sm text-sidebar-ink outline-none ring-1 ring-white/25 focus:ring-contrast"
            maxlength="300"
            :aria-label="t('chat.rename')"
            @blur="saveRename(chat)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
            @keydown.esc.prevent="cancelRename"
          >
        </form>
        <NuxtLink
          v-else
          :to="chatPath(chat)"
          class="min-w-0 flex-1 truncate px-2 py-2 text-sm"
          :class="current(chat.id) ? 'text-sidebar-ink' : 'text-sidebar-muted'"
          @click="open = false"
        >
          {{ chat.title }}
        </NuxtLink>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition hover:bg-white/10 hover:text-sidebar-ink"
          data-chat-menu
          :aria-label="t('chat.actions', { title: chat.title })"
          :aria-expanded="menuId === chat.id"
          @click.stop="toggleMenu(chat, $event)"
        >
          <Icon name="solar:menu-dots-bold" class="size-4" />
        </button>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="openChat"
        ref="menuRoot"
        class="fixed z-50 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1 text-sm text-ink shadow-xl"
        :style="menuStyle"
        role="menu"
        data-chat-menu
      >
        <button type="button" role="menuitem" class="flex w-full items-center rounded-xl px-3 py-2 text-left transition hover:bg-soft" @click="view(openChat)">
          {{ t('chat.view') }}
        </button>
        <button type="button" role="menuitem" class="flex w-full items-center rounded-xl px-3 py-2 text-left transition hover:bg-soft" @click="startRename(openChat)">
          {{ t('chat.rename') }}
        </button>
        <button type="button" role="menuitem" class="flex w-full items-center rounded-xl px-3 py-2 text-left text-red-700 transition hover:bg-red-50" @click="remove(openChat)">
          {{ t('chat.delete') }}
        </button>
      </div>
    </Teleport>
  </section>
</template>
