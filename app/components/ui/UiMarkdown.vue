<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const props = defineProps<{
  source: string
}>()

const html = computed(() => {
  const parsed = marked.parse(props.source || '', { async: false })
  return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', {
    USE_PROFILES: { html: true },
  })
})
</script>

<template>
  <div
    class="chat-md overflow-x-auto text-sm leading-6 text-ink"
    v-html="html"
  />
</template>

<style>
.chat-md > :first-child {
  margin-top: 0;
}

.chat-md > :last-child {
  margin-bottom: 0;
}

.chat-md p,
.chat-md ul,
.chat-md ol,
.chat-md blockquote,
.chat-md pre,
.chat-md table {
  margin: 0.75rem 0;
}

.chat-md h1,
.chat-md h2,
.chat-md h3,
.chat-md h4 {
  margin: 1.1rem 0 0.45rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
}

.chat-md h1 {
  font-size: 1.15rem;
}

.chat-md h2 {
  font-size: 1.05rem;
}

.chat-md h3,
.chat-md h4 {
  font-size: 1rem;
}

.chat-md strong {
  font-weight: 600;
}

.chat-md a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chat-md ul,
.chat-md ol {
  padding-left: 1.25rem;
}

.chat-md ul {
  list-style: disc;
}

.chat-md ol {
  list-style: decimal;
}

.chat-md li {
  margin: 0.25rem 0;
}

.chat-md li > ul,
.chat-md li > ol {
  margin: 0.25rem 0;
}

.chat-md blockquote {
  border-left: 3px solid var(--line);
  padding-left: 0.85rem;
  color: var(--muted);
}

.chat-md code {
  border-radius: 0.35rem;
  background: var(--soft);
  padding: 0.1rem 0.35rem;
  font-size: 0.85em;
}

.chat-md pre {
  overflow-x: auto;
  border-radius: 0.85rem;
  background: var(--soft);
  padding: 0.85rem 1rem;
}

.chat-md pre code {
  background: transparent;
  padding: 0;
  font-size: 0.8rem;
}

.chat-md table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  line-height: 1.45;
}

.chat-md th,
.chat-md td {
  border: 1px solid var(--line);
  padding: 0.55rem 0.7rem;
  text-align: left;
  vertical-align: top;
}

.chat-md th {
  background: var(--soft);
  font-weight: 600;
  white-space: nowrap;
}

.chat-md hr {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid var(--line);
}
</style>
