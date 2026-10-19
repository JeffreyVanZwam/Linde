<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const api = useRequestFetch()
const draft = await api<{
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  markdown: string
  faq: Array<{ question: string, answer: string }>
  keywords: string[]
  internalLinks: Array<{ title: string, url: string }>
  geoNotes: string
  jsonLd: unknown
}>(`/api/seo/drafts/${route.params.id}`)
const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(draft.markdown)
  copied.value = true
}
</script>

<template>
  <article class="mx-auto max-w-3xl space-y-6">
    <AppBack to="/seo" />
    <p class="text-xs uppercase tracking-[0.2em] text-stone-400">
      {{ draft.slug }}
    </p>
    <h1 class="font-serif text-5xl">
      {{ draft.title }}
    </h1>
    <p class="text-stone-600">
      {{ draft.metaTitle }} — {{ draft.metaDescription }}
    </p>
    <UiButton variant="ghost" @click="copy">
      {{ copied ? t('common.save') : t('seo.copy') }}
    </UiButton>
    <pre class="whitespace-pre-wrap rounded-3xl bg-white p-6 text-sm leading-6">{{ draft.markdown }}</pre>
    <UiCard>
      <h2 class="font-serif text-2xl">
        {{ t('seo.keywords') }}
      </h2>
      <p class="mt-2 text-sm">
        {{ draft.keywords.join(', ') }}
      </p>
    </UiCard>
    <UiCard>
      <h2 class="font-serif text-2xl">
        {{ t('seo.faq') }}
      </h2>
      <div v-for="item in draft.faq" :key="item.question" class="mt-3">
        <p class="font-medium">
          {{ item.question }}
        </p>
        <p class="text-sm text-stone-600">
          {{ item.answer }}
        </p>
      </div>
    </UiCard>
    <UiCard>
      <h2 class="font-serif text-2xl">
        {{ t('seo.geo') }}
      </h2>
      <p class="mt-2 whitespace-pre-wrap text-sm">
        {{ draft.geoNotes }}
      </p>
      <a v-for="link in draft.internalLinks" :key="link.url" :href="link.url" class="mt-2 block text-sm text-accent">
        {{ link.title }}
      </a>
    </UiCard>
    <pre class="overflow-auto rounded-3xl bg-ink p-4 text-xs text-stone-100">{{ JSON.stringify(draft.jsonLd, null, 2) }}</pre>
  </article>
</template>
