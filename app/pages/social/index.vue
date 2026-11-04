<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const api = useRequestFetch()
const posts = await api<Array<{ id: string, body: string, status: string }>>('/api/social/posts')
const local = computed(() => posts.filter(post => post.status !== 'published'))
const pumpText = ref('')
const pumpUrl = ref('')
const pumpFile = ref('')
const pumpError = ref('')
const pumping = ref(false)
const tab = ref('posts')
const tabs = computed(() => [
  { id: 'posts', label: t('shell.posts') },
  { id: 'chats', label: t('chat.list') },
])
async function pump() {
  pumping.value = true
  pumpError.value = ''
  try {
    await api('/api/social/pump', {
      method: 'POST',
      body: { text: pumpText.value, url: pumpUrl.value || undefined, fileId: pumpFile.value || undefined },
    })
    pumpText.value = ''
    await refreshNuxtData()
    window.location.reload()
  }
  catch (cause) {
    pumpError.value = errorText(cause) || t('common.error')
  }
  finally {
    pumping.value = false
  }
}

const counts = computed(() => [
  { label: t('seo.drafts'), value: posts.filter(post => post.status === 'draft').length, tone: 'surface' as const },
  { label: t('home.upcoming'), value: posts.filter(post => post.status === 'scheduled').length, tone: 'highlight' as const },
  { label: t('social.published'), value: posts.filter(post => post.status === 'published').length, tone: 'ink' as const },
])
</script>

<template>
  <div class="space-y-5">
    <AppPageHead :title="t('social.title')" :lead="t('social.lead')">
      <template #actions>
        <UiButton variant="ghost" :to="localePath('/social/calendar')">
          {{ t('social.calendar') }}
        </UiButton>
        <UiButton :to="localePath('/social/chat/new')">
          {{ t('social.newChat') }}
        </UiButton>
      </template>
    </AppPageHead>

    <UiCard>
      <h2 class="font-display text-2xl font-semibold tracking-tight">{{ t('forge.pump') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('forge.pumpLead') }}</p>
      <form class="mt-4 space-y-3" @submit.prevent="pump">
        <UiTextarea v-model="pumpText" :rows="4" />
        <div class="grid gap-3 sm:grid-cols-2">
          <UiInput v-model="pumpUrl" :placeholder="t('forge.url')" />
          <UiInput v-model="pumpFile" :placeholder="t('forge.file')" />
        </div>
        <UiButton type="submit" :disabled="pumping || !pumpText.trim()">{{ t('forge.run') }}</UiButton>
        <UiAlert :message="pumpError" />
      </form>
    </UiCard>

    <div class="grid gap-3 sm:grid-cols-3">
      <UiCard v-for="item in counts" :key="item.label" :tone="item.tone" class="min-h-28">
        <p class="text-sm opacity-75">
          {{ item.label }}
        </p>
        <p class="mt-2 font-display text-4xl font-semibold tracking-tight">
          {{ item.value }}
        </p>
      </UiCard>
    </div>

    <UiTabs v-model="tab" :items="tabs" :label="t('social.title')" />

    <div v-if="tab === 'posts'">
      <p v-if="!local.length" class="text-sm text-muted">
        {{ t('social.emptyCalendar') }}
      </p>
      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="(post, index) in local"
          :key="post.id"
          :to="localePath(`/social/compose?post=${post.id}`)"
          class="flex min-h-40 flex-col justify-between rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.45)] transition duration-200 hover:-translate-y-0.5"
          :class="index === 0 ? 'sm:col-span-2 xl:col-span-2' : ''"
        >
          <span class="self-start rounded-full bg-cta px-2.5 py-1 text-[11px] font-semibold text-cta-ink">
            {{ post.status }}
          </span>
          <span class="mt-4 line-clamp-4 text-sm leading-relaxed">{{ post.body }}</span>
        </NuxtLink>
      </div>
    </div>
    <ChatList v-else module="social" tiles />
  </div>
</template>
