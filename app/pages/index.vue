<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const me = useState<{ user: { name: string }, brand: { companyName: string | null, toneOfVoice: string | null, colors: string[] } | null }>('me')

const api = useRequestFetch()
const [posts, campaigns, chats] = await Promise.all([
  api<Array<{ id: string, body: string, status: string, scheduledAt: string | null }>>('/api/social/posts'),
  api<Array<{ id: string, name: string, status: string }>>('/api/outreach/campaigns'),
  api<Array<{ id: string, title: string, module: string }>>('/api/conversations'),
])

const upcoming = computed(() => posts.filter(post => post.status === 'scheduled').slice(0, 5))
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="font-serif text-5xl">
        {{ t('home.welcome', { name: me?.user.name }) }}
      </h1>
      <p class="mt-3 max-w-2xl text-stone-600">
        {{ t('home.lead') }}
      </p>
    </div>
    <UiCard v-if="me?.brand">
      <p class="text-xs uppercase tracking-[0.2em] text-stone-400">
        {{ t('nav.brain') }}
      </p>
      <p class="mt-2 font-serif text-3xl">
        {{ me.brand.companyName }}
      </p>
      <p class="mt-2 text-sm text-stone-600">
        {{ me.brand.toneOfVoice }}
      </p>
      <div class="mt-4 flex gap-2">
        <span v-for="color in me.brand.colors" :key="color" class="h-8 w-8 rounded-full border border-line" :style="{ background: color }" />
      </div>
    </UiCard>
    <div class="grid gap-4 lg:grid-cols-3">
      <UiCard>
        <h2 class="font-serif text-2xl">
          {{ t('home.upcoming') }}
        </h2>
        <p v-if="!upcoming.length" class="mt-3 text-sm text-stone-500">
          {{ t('home.emptyPosts') }}
        </p>
        <NuxtLink v-for="post in upcoming" :key="post.id" :to="localePath(`/social/compose?post=${post.id}`)" class="mt-3 block text-sm">
          {{ post.body.slice(0, 90) }}
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-serif text-2xl">
          {{ t('home.campaigns') }}
        </h2>
        <p v-if="!campaigns.length" class="mt-3 text-sm text-stone-500">
          {{ t('home.emptyCampaigns') }}
        </p>
        <NuxtLink v-for="campaign in campaigns.slice(0, 5)" :key="campaign.id" :to="localePath(`/outreach/${campaign.id}`)" class="mt-3 block text-sm">
          {{ campaign.name }}
        </NuxtLink>
      </UiCard>
      <UiCard>
        <h2 class="font-serif text-2xl">
          {{ t('home.chats') }}
        </h2>
        <p v-if="!chats.length" class="mt-3 text-sm text-stone-500">
          {{ t('home.emptyChats') }}
        </p>
        <NuxtLink
          v-for="chat in chats.slice(0, 5)"
          :key="chat.id"
          :to="localePath(chat.module === 'strategy' ? `/strategy/${chat.id}` : `/${chat.module === 'social' ? 'social/chat' : chat.module === 'seo' ? 'seo/chat' : 'outreach/chat'}/${chat.id}`)"
          class="mt-3 block text-sm"
        >
          {{ chat.title }}
        </NuxtLink>
      </UiCard>
    </div>
  </div>
</template>
