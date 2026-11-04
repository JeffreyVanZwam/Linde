import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { brandInstructions, type BrandView } from './brand'
import { completeText, parseJsonBlock } from './complete'
import { textPdf } from './files/pdf'
import { textFromBytes } from './files/text'
import { listNotes } from './knowledge'
import { readMediaBytes, saveMedia } from './media'
import { createRecord, filterOf, listRecords, oneRecord, updateRecord } from './pb'
import {
  createPost,
  createTarget,
  findDraft,
  findMedia,
  listSocialAccounts,
  setOpenTargetsStatus,
  updateDraft,
  updatePost,
} from './store'

type Scope = { userId: string, brand: BrandView }

async function context(scope: Scope) {
  const notes = await listNotes(scope.userId, scope.brand.id)
  return brandInstructions(scope.brand, notes)
}

async function draftPosts(scope: Scope, items: Array<{ angle: string, body: string }>, source = 'local') {
  const accounts = await listSocialAccounts(scope.userId, scope.brand.id)
  const ids: string[] = []
  for (const item of items) {
    const postId = await createPost({
      userId: scope.userId,
      brandId: scope.brand.id,
      body: item.body,
      angle: item.angle,
      status: 'draft',
      source,
    })
    for (const account of accounts) {
      const rule = platformLimits[account.platform as SocialPlatform]
      if (!rule || rule.requires === 'video') continue
      await createTarget({
        postId,
        accountId: account.id,
        platform: account.platform,
        body: item.body.slice(0, rule.body),
        title: account.platform === 'pinterest' ? item.angle.slice(0, 100) : null,
        status: 'draft',
      })
    }
    ids.push(postId)
  }
  return ids
}

export async function pumpContent(scope: Scope, input: { text: string, url?: string, fileId?: string }) {
  let extra = ''
  if (input.url) extra += `\n\nBron-URL:\n${await pageText(input.url)}`
  if (input.fileId) {
    const media = await findMedia(input.fileId)
    if (!media || media.userId !== scope.userId || media.brandId !== scope.brand.id) {
      throw createError({ statusCode: 404, statusMessage: 'Bestand niet gevonden' })
    }
    const bytes = await readMediaBytes(media.id)
    if (bytes) extra += `\n\nBestand ${media.name}:\n${textFromBytes(bytes, media.mime, media.name)}`
  }
  const raw = await completeText(
    'Je schrijft social posts in de stem van het merk. Verzin geen cijfers. Antwoord alleen met JSON: {"posts":[{"angle":"","body":""}]}. Maximaal 3 posts.',
    `${await context(scope)}\n\nInvoer:\n${input.text}${extra}`,
  )
  const parsed = parseJsonBlock<{ posts?: Array<{ angle?: string, body?: string }> }>(raw)
  const posts = (parsed.posts || []).filter(post => post.body?.trim()).slice(0, 3).map(post => ({
    angle: String(post.angle || 'Update').slice(0, 120),
    body: String(post.body),
  }))
  if (!posts.length) throw createError({ statusCode: 502, statusMessage: 'Geen posts uit de invoer' })
  const ids = await draftPosts(scope, posts)
  return { ids }
}

export async function improveCaption(scope: Scope, body: string, instruction: string) {
  const labels: Record<string, string> = {
    shorter: 'Maak de tekst korter, zonder nieuwe feiten.',
    hook: 'Geef de eerste zin een sterkere haak. De rest blijft inhoudelijk gelijk.',
    casual: 'Maak de toon losser en menselijker.',
    sell: 'Maak duidelijker waarom iemand hier iets aan heeft, zonder reclameclichés.',
  }
  const ask = labels[instruction] || instruction
  const text = await completeText(
    'Herschrijf alleen de caption. Geen uitleg, geen aanhalingstekens eromheen.',
    `${await context(scope)}\n\nOpdracht: ${ask}\n\nCaption:\n${body}`,
  )
  return text.replace(/^["']|["']$/g, '').trim()
}

export async function suggestToday(scope: Scope) {
  const raw = await completeText(
    'Stel één social post voor over iets dat bij dit merk past. JSON: {"angle":"","body":""}.',
    await context(scope),
  )
  const parsed = parseJsonBlock<{ angle?: string, body?: string }>(raw)
  if (!parsed.body?.trim()) throw createError({ statusCode: 502, statusMessage: 'Geen suggestie' })
  const ids = await draftPosts(scope, [{ angle: String(parsed.angle || 'Vandaag'), body: parsed.body }])
  return { id: ids[0] }
}

export async function rewriteParagraph(scope: Scope, draftId: string, quote: string, instruction: string) {
  const draft = await findDraft(draftId, scope.userId, scope.brand.id)
  if (!draft) throw createError({ statusCode: 404, statusMessage: 'Concept niet gevonden' })
  if (!draft.markdown.includes(quote)) throw createError({ statusCode: 400, statusMessage: 'Die alinea staat niet in het artikel' })
  const next = await completeText(
    'Herschrijf alleen de aangegeven alinea. Geef alleen de nieuwe alinea terug.',
    `${await context(scope)}\n\nOpdracht: ${instruction}\n\nAlinea:\n${quote}`,
  )
  const markdown = draft.markdown.replace(quote, next.trim())
  await updateDraft(draft.id, { markdown })
  return { markdown }
}

export async function repurposeDraft(scope: Scope, draftId: string) {
  const draft = await findDraft(draftId, scope.userId, scope.brand.id)
  if (!draft) throw createError({ statusCode: 404, statusMessage: 'Concept niet gevonden' })
  const raw = await completeText(
    'Maak twee social posts van dit artikel. Verzin niets wat er niet in staat. JSON: {"posts":[{"angle":"","body":""}]}.',
    `${await context(scope)}\n\nTitel: ${draft.title}\n\n${draft.markdown.slice(0, 6000)}`,
  )
  const parsed = parseJsonBlock<{ posts?: Array<{ angle?: string, body?: string }> }>(raw)
  const posts = (parsed.posts || []).filter(post => post.body?.trim()).slice(0, 2).map(post => ({
    angle: String(post.angle || draft.title).slice(0, 120),
    body: String(post.body),
  }))
  return { ids: await draftPosts(scope, posts) }
}

export async function companionForCampaign(scope: Scope, campaign: { name: string, goal: string | null, offer: string | null }) {
  const raw = await completeText(
    'Schrijf twee social posts die bij deze mailcampagne horen, rond het verzendmoment. JSON: {"posts":[{"angle":"","body":""}]}.',
    `${await context(scope)}\n\nCampagne: ${campaign.name}\nDoel: ${campaign.goal || ''}\nAanbod: ${campaign.offer || ''}`,
  )
  const parsed = parseJsonBlock<{ posts?: Array<{ angle?: string, body?: string }> }>(raw)
  const posts = (parsed.posts || []).filter(post => post.body?.trim()).slice(0, 2).map(post => ({
    angle: String(post.angle || campaign.name).slice(0, 120),
    body: String(post.body),
  }))
  return { ids: await draftPosts(scope, posts) }
}

export async function smartReplies(scope: Scope, text: string) {
  const raw = await completeText(
    'Schrijf drie korte antwoorden op deze reactie, in de merkstem. JSON: {"replies":["",""]}. Niet plaatsen, alleen voorstellen.',
    `${await context(scope)}\n\nReactie:\n${text}`,
  )
  const parsed = parseJsonBlock<{ replies?: string[] }>(raw)
  return (parsed.replies || []).map(reply => reply.trim()).filter(Boolean).slice(0, 3)
}

export async function proofPost(scope: Scope, input: { author: string, quote: string, source: string }) {
  const raw = await completeText(
    'Maak één social post van deze testimonial. Houd het citaat intact. JSON: {"angle":"","body":""}.',
    `${await context(scope)}\n\n${input.author}: "${input.quote}" (${input.source})`,
  )
  const parsed = parseJsonBlock<{ angle?: string, body?: string }>(raw)
  if (!parsed.body?.trim()) throw createError({ statusCode: 502, statusMessage: 'Geen post' })
  const ids = await draftPosts(scope, [{ angle: String(parsed.angle || 'Bewijs'), body: parsed.body }])
  const row = await createRecord('testimonials', {
    user: scope.userId,
    brand: scope.brand.id,
    author: input.author,
    quote: input.quote,
    source: input.source,
    post: ids[0] || '',
  })
  return { id: ids[0], testimonialId: row.id }
}

export async function listTestimonials(userId: string, brandId: string) {
  const rows = await listRecords('testimonials', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-created',
  })
  return rows.map(row => ({
    id: row.id,
    author: String(row.author || ''),
    quote: String(row.quote || ''),
    source: String(row.source || ''),
    postId: typeof row.post === 'string' ? row.post : '',
  }))
}

export async function startSeries(scope: Scope, input: { title: string, prompt: string, cadenceDays: number, lengthDays: number }) {
  const raw = await completeText(
    `Schrijf ${input.lengthDays} social posts voor een reeks. JSON: {"posts":[{"angle":"","body":""}]}.`,
    `${await context(scope)}\n\nReeks: ${input.title}\n${input.prompt}`,
  )
  const parsed = parseJsonBlock<{ posts?: Array<{ angle?: string, body?: string }> }>(raw)
  const posts = (parsed.posts || []).filter(post => post.body?.trim()).slice(0, input.lengthDays)
  const series = await createRecord('content_series', {
    user: scope.userId,
    brand: scope.brand.id,
    title: input.title,
    prompt: input.prompt,
    cadenceDays: input.cadenceDays,
    lengthDays: input.lengthDays,
    status: 'active',
    startsOn: new Date().toISOString(),
  })
  const start = new Date()
  start.setHours(9, 5, 0, 0)
  const items = []
  for (const [index, post] of posts.entries()) {
    const when = new Date(start)
    when.setDate(start.getDate() + index * input.cadenceDays)
    const ids = await draftPosts(scope, [{ angle: String(post.angle || input.title), body: String(post.body) }])
    await updatePost(ids[0]!, { scheduledAt: when })
    const item = await createRecord('series_posts', {
      series: series.id,
      position: index,
      post: ids[0],
      status: 'draft',
      scheduledAt: when.toISOString(),
    })
    items.push({ id: item.id, postId: ids[0], position: index, scheduledAt: when.toISOString(), status: 'draft' })
  }
  return { id: series.id, items }
}

export async function listSeries(userId: string, brandId: string) {
  const rows = await listRecords('content_series', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-created',
  })
  const result = []
  for (const row of rows) {
    const items = await listRecords('series_posts', {
      filter: await filterOf('series = {:id}', { id: row.id }),
      sort: 'position',
    })
    result.push({
      id: row.id,
      title: String(row.title || ''),
      status: String(row.status || ''),
      cadenceDays: Number(row.cadenceDays || 1),
      items: items.map(item => ({
        id: item.id,
        position: Number(item.position || 0),
        postId: typeof item.post === 'string' ? item.post : '',
        status: String(item.status || ''),
        scheduledAt: typeof item.scheduledAt === 'string' ? item.scheduledAt : null,
      })),
    })
  }
  return result
}

export async function approveSeriesItem(userId: string, brandId: string, itemId: string) {
  const item = await oneRecord('series_posts', itemId)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Reeksitem niet gevonden' })
  const series = await oneRecord('content_series', String(item.series || ''))
  if (!series || series.user !== userId || series.brand !== brandId) {
    throw createError({ statusCode: 404, statusMessage: 'Reeks niet gevonden' })
  }
  const postId = typeof item.post === 'string' ? item.post : ''
  const when = typeof item.scheduledAt === 'string' && item.scheduledAt ? new Date(item.scheduledAt) : new Date()
  if (postId) {
    await updatePost(postId, { status: 'scheduled', scheduledAt: when })
    await setOpenTargetsStatus(postId, 'scheduled')
  }
  await updateRecord('series_posts', itemId, { status: 'approved' })
  return { ok: true }
}

export async function buildLeadMagnet(scope: Scope, input: { problem: string, kind: 'checklist' | 'guide' }) {
  const raw = await completeText(
    'Schrijf een kort lead magnet in markdown. JSON: {"title":"","body":""}. Geen verzonnen cijfers. Maximaal 1200 woorden.',
    `${await context(scope)}\n\nProbleem: ${input.problem}\nType: ${input.kind === 'checklist' ? 'checklist' : 'gids'}`,
  )
  const parsed = parseJsonBlock<{ title?: string, body?: string }>(raw)
  const title = String(parsed.title || input.problem).slice(0, 180)
  const body = String(parsed.body || '').trim()
  if (!body) throw createError({ statusCode: 502, statusMessage: 'Geen tekst' })
  const pdf = textPdf(title, body.replace(/[#>*_`]/g, ''))
  const fileId = await saveMedia({
    userId: scope.userId,
    brandId: scope.brand.id,
    bytes: pdf,
    mime: 'application/pdf',
    source: 'generated',
    name: `${title}.pdf`,
    extension: '.pdf',
  })
  const ids = await draftPosts(scope, [{
    angle: title,
    body: `${title}\n\n${input.problem}\n\nDe PDF staat in de bibliotheek.`,
  }])
  const row = await createRecord('lead_magnets', {
    user: scope.userId,
    brand: scope.brand.id,
    problem: input.problem,
    title,
    kind: input.kind,
    body,
    file: fileId,
    post: ids[0] || '',
  })
  return { id: row.id, title, fileId, postId: ids[0] }
}

export async function listLeadMagnets(userId: string, brandId: string) {
  const rows = await listRecords('lead_magnets', {
    filter: await filterOf('user = {:user} && brand = {:brand}', { user: userId, brand: brandId }),
    sort: '-created',
  })
  return rows.map(row => ({
    id: row.id,
    title: String(row.title || ''),
    kind: String(row.kind || ''),
    problem: String(row.problem || ''),
    fileId: typeof row.file === 'string' ? row.file : '',
    postId: typeof row.post === 'string' ? row.post : '',
  }))
}

async function pageText(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) return ''
  const html = await response.text()
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
}
