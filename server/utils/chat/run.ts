import { stepCountIs, streamText, tool } from 'ai'
import { z } from 'zod'
import { chatModules, platformLimits, socialPlatforms, type ChatModule } from '~~/shared/platforms'
import { aiConfig, getLanguageModel } from '../ai'
import { brandInstructions, getBrand } from '../brand'
import { listNotes } from '../knowledge'
import { recentPerformance, socialBrief } from '../social/history'
import { accountDuplicate, comparableTargets } from '../social/posts'
import { createCampaign, createConversation, createDraft, createMessage, createPost, createStep, createTarget, findConversation, listMessages, listSiteArticles, listSocialAccounts, touchConversation } from '../store'

const chatSchema = z.object({
  module: z.enum(chatModules),
  conversationId: z.string().optional(),
  content: z.string().min(1).max(8000),
  locale: z.enum(['nl', 'en']).default('nl'),
})

export function parseChat(data: unknown) {
  return chatSchema.parse(data)
}

export async function streamChat(userId: string, brandId: string, input: z.infer<typeof chatSchema>) {
  let conversationId = input.conversationId
  if (conversationId) {
    const existing = await findConversation(conversationId, userId, brandId)
    if (!existing || existing.module !== input.module) {
      throw createError({ statusCode: 404, statusMessage: 'Gesprek niet gevonden' })
    }
  }
  else {
    conversationId = await createConversation({
      userId,
      brandId,
      module: input.module,
      title: input.content.slice(0, 80),
    })
  }
  await createMessage({ conversationId, role: 'user', content: input.content })
  await touchConversation(conversationId)
  const history = await listMessages(conversationId)
  const brand = await getBrand(userId)
  const notes = await listNotes(userId, brandId)
  const language = input.locale === 'en' ? 'Answer in English.' : 'Antwoord in het Nederlands.'
  const brief = input.module === 'social' ? await socialBrief(userId, brandId, input.locale) : ''
  const ai = aiConfig()
  const fallback = input.locale === 'en'
    ? 'Done. The result is saved in this module.'
    : 'Klaar. Het resultaat staat in deze module.'
  let saved = false
  async function saveAssistant(content: string) {
    if (saved) return
    saved = true
    await createMessage({ conversationId: conversationId!, role: 'assistant', content })
  }
  const result = streamText({
    model: getLanguageModel(),
    maxRetries: ai.tier === 'free' ? 0 : 2,
    instructions: `${language}\n\n${instructions(input.module)}${brief ? `\n\n${brief}` : ''}\n\nMerkprofiel:\n${brandInstructions(brand, notes)}`,
    messages: history
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content })),
    tools: toolsFor(userId, brandId, input.module, conversationId),
    stopWhen: stepCountIs(5),
    abortSignal: AbortSignal.timeout(180_000),
    onError: async ({ error }) => {
      await saveAssistant(failureText(error, input.locale))
    },
    onFinish: async ({ text, toolCalls, steps }) => {
      await saveAssistant(replyText(text, toolCalls, steps, fallback))
    },
  })
  const response = result.toTextStreamResponse()
  const headers = new Headers(response.headers)
  headers.set('x-conversation-id', conversationId)
  return new Response(response.body, { status: response.status, headers })
}

function replyText(text: string, toolCalls: readonly unknown[], steps: readonly { text: string }[], fallback: string) {
  const prose = steps
    .map(step => step.text.trim())
    .filter(part => part.length > 0 && !part.startsWith('{') && !part.startsWith('['))
  if (prose.length) return prose.join('\n\n')
  if (toolCalls.length) return fallback
  return text.trim() || fallback
}

function failureText(error: unknown, locale: 'nl' | 'en') {
  const message = error instanceof Error ? error.message : ''
  const retry = message.match(/retry after (\d+)/i)?.[1]
  if (locale === 'en') {
    if (retry) return `The free model is busy. Try again in ${retry} seconds.`
    return message ? `The model did not answer. ${message.slice(0, 280)}` : 'The model did not answer.'
  }
  if (retry) return `Het gratis model is even bezet. Probeer het over ${retry} seconden opnieuw.`
  return message ? `Het model gaf geen antwoord. ${message.slice(0, 280)}` : 'Het model gaf geen antwoord.'
}

function instructions(module: ChatModule) {
  if (module === 'strategy') {
    return 'Je bent een business-strateeg. Help met positionering, aanbod, kanalen en prioriteiten. Gebruik alleen het merkprofiel. Verzin geen cijfers.'
  }
  if (module === 'social') {
    return 'Je stelt social posts voor. Roep proposePost aan zodra de gebruiker een post wil. Pas de tekst per platform aan. YouTube en TikTok hebben video nodig, Instagram en Pinterest een afbeelding, X blijft binnen 280 tekens. Gebruik het prestatieoverzicht en getRecentPosts per account. Een target dat te veel lijkt op een bestaande post van dat account wordt overgeslagen; herschrijf dan alleen dat platform. Volg de schrijfregels van het merk.'
  }
  if (module === 'seo') {
    return 'Je schrijft SEO- en GEO-artikelen. GEO betekent dat het stuk citeerbaar is voor antwoordmachines: heldere entiteiten, definities, FAQ en merkconsistente feiten. Roep saveArticleDraft aan met het volledige artikel. Sluit aan op bestaande artikelen tenzij de gebruiker een nieuw thema vraagt. Publiceer niets zelf naar de website.'
  }
  return 'Je zet een nette acquisitieflow op met voorbeeldmails. Roep saveOutreachPlan aan. De gebruiker levert zelf ontvangers aan. Geen misleiding, geen nepadressen, en elke mail blijft een concept tot de gebruiker die accordeert.'
}

function toolsFor(userId: string, brandId: string, module: ChatModule, conversationId: string) {
  if (module === 'strategy') return {}
  if (module === 'social') return socialTools(userId, brandId, conversationId)
  if (module === 'seo') return seoTools(userId, brandId, conversationId)
  return outreachTools(userId, brandId, conversationId)
}

function socialTools(userId: string, brandId: string, conversationId: string) {
  return {
    getRecentPosts: tool({
      description: 'Lees recente geplaatste posts per account, met een prestatielabel dat alleen binnen dat account geldt.',
      inputSchema: z.object({}),
      execute: async () => recentPerformance(userId, brandId),
    }),
    proposePost: tool({
      description: 'Sla een conceptpost op met platformspecifieke tekst. Een bijna-duplicaat op één account wordt overgeslagen; de andere platforms worden wel opgeslagen.',
      inputSchema: z.object({
        body: z.string(),
        imagePrompt: z.string().optional(),
        targets: z.array(z.object({
          platform: z.enum(socialPlatforms),
          body: z.string(),
          title: z.string().optional(),
        })).min(1),
      }),
      execute: async (input) => {
        const accounts = await listSocialAccounts(userId, brandId)
        const corpus = await comparableTargets(userId, brandId)
        const missing: string[] = []
        const skipped: Array<{ platform: string, reason: string }> = []
        const accepted: Array<{ accountId: string, platform: typeof input.targets[number]['platform'], body: string, title: string | null }> = []
        for (const target of input.targets) {
          const account = accounts.find(item => item.platform === target.platform)
          if (!account) {
            missing.push(target.platform)
            continue
          }
          const limit = platformLimits[target.platform]
          const body = target.body.slice(0, limit.body)
          const reason = accountDuplicate(body, account.id, corpus)
          if (reason) {
            skipped.push({ platform: target.platform, reason })
            continue
          }
          accepted.push({
            accountId: account.id,
            platform: target.platform,
            body,
            title: target.title?.slice(0, limit.title || 150) || null,
          })
        }
        const warning = skipped.map(item => `${item.platform}: ${item.reason}`).join('\n') || null
        if (!accepted.length) {
          return { postId: null, duplicateWarning: warning, skippedPlatforms: skipped, missingPlatforms: missing, imagePrompt: input.imagePrompt || null }
        }
        const postId = await createPost({
          userId,
          brandId,
          conversationId,
          body: input.body,
          status: 'draft',
          source: 'local',
          duplicateWarning: warning,
        })
        for (const target of accepted) {
          await createTarget({
            postId,
            accountId: target.accountId,
            platform: target.platform,
            body: target.body,
            title: target.title,
            status: 'draft',
          })
        }
        return { postId, duplicateWarning: warning, skippedPlatforms: skipped, missingPlatforms: missing, imagePrompt: input.imagePrompt || null }
      },
    }),
  }
}

function seoTools(userId: string, brandId: string, conversationId: string) {
  return {
    listArticles: tool({
      description: 'Toon artikelen die al op de site staan.',
      inputSchema: z.object({}),
      execute: async () => {
        const articles = await listSiteArticles(userId, brandId)
        return articles.map(article => ({ title: article.title, url: article.url, excerpt: article.excerpt }))
      },
    }),
    saveArticleDraft: tool({
      description: 'Sla een SEO/GEO-artikelconcept op.',
      inputSchema: z.object({
        title: z.string(),
        slug: z.string(),
        metaTitle: z.string(),
        metaDescription: z.string(),
        markdown: z.string(),
        faq: z.array(z.object({ question: z.string(), answer: z.string() })),
        keywords: z.array(z.string()),
        internalLinks: z.array(z.object({ title: z.string(), url: z.string() })),
        geoNotes: z.string(),
        jsonLd: z.record(z.string(), z.unknown()),
      }),
      execute: async (input) => {
        const draftId = await createDraft({
          userId,
          brandId,
          conversationId,
          title: input.title,
          slug: input.slug,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          markdown: input.markdown,
          faq: input.faq,
          jsonLd: input.jsonLd,
          keywords: input.keywords,
          internalLinks: input.internalLinks,
          geoNotes: input.geoNotes,
        })
        return { draftId, title: input.title }
      },
    }),
  }
}

function outreachTools(userId: string, brandId: string, conversationId: string) {
  return {
    saveOutreachPlan: tool({
      description: 'Sla een acquisitiecampagne met voorbeeldmails op als concept.',
      inputSchema: z.object({
        name: z.string(),
        goal: z.string(),
        audience: z.string(),
        offer: z.string(),
        steps: z.array(z.object({
          delayHours: z.number().min(0),
          subject: z.string(),
          body: z.string(),
        })).min(1).max(6),
      }),
      execute: async (input) => {
        const campaignId = await createCampaign({
          userId,
          brandId,
          conversationId,
          name: input.name,
          goal: input.goal,
          audience: input.audience,
          offer: input.offer,
          status: 'draft',
        })
        for (const [index, step] of input.steps.entries()) {
          await createStep({
            campaignId,
            position: index,
            delayHours: step.delayHours,
            subject: step.subject,
            body: step.body,
          })
        }
        return { campaignId, steps: input.steps.length }
      },
    }),
  }
}
