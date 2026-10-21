<script setup lang="ts">
import type { ChatModule } from '~~/shared/platforms'

const props = defineProps<{
  module?: ChatModule
  limit?: number
  plain?: boolean
  empty?: string
}>()

type ChatSummary = { id: string, title: string, module: string }

const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const { confirmDelete, deleteChat } = useDeleteChat()

const chats = ref(await api<ChatSummary[]>(props.module ? `/api/conversations?module=${props.module}` : '/api/conversations'))
const visible = computed(() => props.limit ? chats.value.slice(0, props.limit) : chats.value)
const error = ref('')
const pendingId = ref('')

function path(chat: ChatSummary) {
  if (chat.module === 'strategy') return localePath(`/strategy/${chat.id}`)
  if (chat.module === 'social') return localePath(`/social/chat/${chat.id}`)
  if (chat.module === 'seo') return localePath(`/seo/chat/${chat.id}`)
  return localePath(`/outreach/chat/${chat.id}`)
}

async function remove(chat: ChatSummary) {
  if (pendingId.value || !confirmDelete()) return
  error.value = ''
  pendingId.value = chat.id
  try {
    await deleteChat(chat.id)
    chats.value = chats.value.filter(item => item.id !== chat.id)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
  finally {
    pendingId.value = ''
  }
}
</script>

<template>
  <div>
    <p v-if="!visible.length" class="text-sm text-muted">
      {{ empty || t('chat.empty') }}
    </p>
    <UiAlert :class="error ? 'mb-3' : undefined" :message="error" />
    <div :class="plain ? 'divide-y divide-line' : 'grid gap-3'">
      <div
        v-for="chat in visible"
        :key="chat.id"
        :class="plain ? 'flex items-center gap-3 py-3' : 'flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface px-5 py-3 transition duration-200 hover:-translate-y-0.5'"
      >
        <NuxtLink :to="path(chat)" class="min-w-0 flex-1 text-sm">
          {{ chat.title }}
        </NuxtLink>
        <UiButton
          variant="danger"
          class="shrink-0"
          :disabled="pendingId === chat.id"
          :aria-label="t('chat.deleteNamed', { title: chat.title })"
          @click="remove(chat)"
        >
          {{ pendingId === chat.id ? t('common.loading') : t('chat.delete') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
