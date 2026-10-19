<script setup lang="ts">
import type { ChatModule } from '~~/shared/platforms'

const props = defineProps<{
  module: ChatModule
  conversationId?: string
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

type ChatMessage = { id: string, role: string, content: string }
const history = ref<ChatMessage[]>([])
const draft = ref('')
const pending = ref('')
const busy = ref(false)
const error = ref('')

const basePath = computed(() => {
  if (props.module === 'strategy') return '/strategy'
  if (props.module === 'social') return '/social/chat'
  if (props.module === 'seo') return '/seo/chat'
  return '/outreach/chat'
})

const api = useRequestFetch()
const { confirmDelete, deleteChat } = useDeleteChat()
const removing = ref(false)
const canDelete = computed(() => Boolean(props.conversationId && props.conversationId !== 'new'))

const listPath = computed(() => {
  if (props.module === 'strategy') return '/strategy'
  if (props.module === 'social') return '/social'
  if (props.module === 'seo') return '/seo'
  return '/outreach'
})

async function load() {
  if (!props.conversationId || props.conversationId === 'new') {
    history.value = []
    return
  }
  const data = await api<{ messages: ChatMessage[] }>(`/api/conversations/${props.conversationId}`)
  history.value = data.messages
}

await load()
watch(() => props.conversationId, load)

async function removeConversation() {
  if (!canDelete.value || !props.conversationId || removing.value || busy.value) return
  if (!confirmDelete()) return
  removing.value = true
  error.value = ''
  try {
    await deleteChat(props.conversationId)
    await navigateTo(localePath(listPath.value))
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
    removing.value = false
  }
}

async function send() {
  const content = draft.value.trim()
  if (!content || busy.value || removing.value) return
  error.value = ''
  busy.value = true
  pending.value = ''
  history.value.push({ id: `local-${Date.now()}`, role: 'user', content })
  draft.value = ''
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        module: props.module,
        conversationId: props.conversationId === 'new' ? undefined : props.conversationId,
        content,
        locale: locale.value,
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.statusMessage || t('common.error'))
    }
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    while (reader) {
      const chunk = await reader.read()
      if (chunk.done) break
      pending.value += decoder.decode(chunk.value, { stream: true })
    }
    const conversationId = response.headers.get('x-conversation-id')
    if (conversationId && props.conversationId === 'new') {
      await navigateTo(localePath(`${basePath.value}/${conversationId}`))
      return
    }
    await load()
    pending.value = ''
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('common.error')
  }
  finally {
    busy.value = false
  }
}

const suggestions = computed(() => {
  if (props.module === 'strategy') return locale.value === 'en'
    ? ['Where should we focus this quarter?', 'Who is the real buyer?']
    : ['Waar moeten we dit kwartaal op focussen?', 'Wie is de echte koper?']
  if (props.module === 'social') return locale.value === 'en'
    ? ['Draft a LinkedIn post about what we do.', 'Propose one post for every connected channel.']
    : ['Schrijf een LinkedIn-post over wat we doen.', 'Stel één post voor per gekoppeld kanaal.']
  if (props.module === 'seo') return locale.value === 'en'
    ? ['Write a follow-up to an existing article.', 'Propose a new theme we do not cover yet.']
    : ['Schrijf een vervolg op een bestaand artikel.', 'Stel een nieuw thema voor dat we nog niet hebben.']
  return locale.value === 'en'
    ? ['Build a three-step cold email sequence.', 'Write a short acquisition mail for our offer.']
    : ['Zet een reeks van drie acquisitiemails op.', 'Schrijf een korte acquisitiemail over ons aanbod.']
})
</script>

<template>
  <div class="space-y-4">
    <AppBack :to="listPath" />
    <UiCard class="flex min-h-[32rem] flex-col">
    <div v-if="canDelete" class="mb-4 flex justify-end">
      <UiButton variant="danger" :disabled="busy || removing" @click="removeConversation">
        {{ removing ? t('common.loading') : t('chat.delete') }}
      </UiButton>
    </div>
    <div class="flex-1 space-y-4">
      <p v-if="!history.length && !pending" class="text-sm text-stone-500">
        {{ t('strategy.empty') }}
      </p>
      <article v-for="message in history" :key="message.id" class="max-w-3xl">
        <p class="text-xs uppercase tracking-wide text-stone-400">
          {{ message.role === 'user' ? t('chat.you') : t('chat.assistant') }}
        </p>
        <p class="mt-1 whitespace-pre-wrap text-sm leading-6">
          {{ message.content }}
        </p>
      </article>
      <article v-if="pending" class="max-w-3xl">
        <p class="text-xs uppercase tracking-wide text-stone-400">
          {{ t('chat.assistant') }}
        </p>
        <p class="mt-1 whitespace-pre-wrap text-sm leading-6">
          {{ pending }}
        </p>
      </article>
    </div>
    <UiAlert class="mt-4" :message="error" />
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        class="min-h-11 rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600"
        @click="draft = suggestion"
      >
        {{ suggestion }}
      </button>
    </div>
    <form class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="send">
      <UiTextarea v-model="draft" :rows="3" :placeholder="t('chat.placeholder')" class="flex-1" />
      <UiButton type="submit" :disabled="busy || removing">
        {{ busy ? t('common.loading') : t('chat.send') }}
      </UiButton>
    </form>
    <p class="sr-only">
      {{ route.path }}
    </p>
    </UiCard>
  </div>
</template>
