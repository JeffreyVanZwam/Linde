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
  <article class="space-y-5">
    <AppBack to="/seo" />
    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
      <div class="space-y-4">
        <AppPageHead :eyebrow="draft.slug" :title="draft.title" :lead="`${draft.metaTitle} — ${draft.metaDescription}`">
          <template #actions>
            <UiButton variant="ghost" @click="copy">
              {{ copied ? t('common.save') : t('seo.copy') }}
            </UiButton>
          </template>
        </AppPageHead>
        <pre class="whitespace-pre-wrap rounded-[1.6rem] border border-line bg-surface p-6 text-sm leading-6">{{ draft.markdown }}</pre>
      </div>
      <div class="space-y-4 xl:sticky xl:top-0">
        <UiCard tone="highlight">
          <h2 class="font-display text-xl font-semibold tracking-tight">
            {{ t('seo.keywords') }}
          </h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="keyword in draft.keywords" :key="keyword" class="rounded-full bg-surface/50 px-3 py-1 text-xs font-medium">
              {{ keyword }}
            </span>
          </div>
        </UiCard>
        <UiCard>
          <h2 class="font-display text-xl font-semibold tracking-tight">
            {{ t('seo.faq') }}
          </h2>
          <div v-for="item in draft.faq" :key="item.question" class="mt-3 border-t border-line pt-3 first:border-t-0 first:pt-0">
            <p class="font-medium">
              {{ item.question }}
            </p>
            <p class="text-sm text-muted">
              {{ item.answer }}
            </p>
          </div>
        </UiCard>
        <UiCard tone="ink">
          <h2 class="font-display text-xl font-semibold tracking-tight">
            {{ t('seo.geo') }}
          </h2>
          <p class="mt-2 whitespace-pre-wrap text-sm opacity-85">
            {{ draft.geoNotes }}
          </p>
          <a v-for="link in draft.internalLinks" :key="link.url" :href="link.url" class="mt-2 block text-sm underline">
            {{ link.title }}
          </a>
        </UiCard>
        <pre class="overflow-auto rounded-[1.4rem] bg-sidebar p-4 text-xs text-sidebar-ink">{{ JSON.stringify(draft.jsonLd, null, 2) }}</pre>
      </div>
    </div>
  </article>
</template>
