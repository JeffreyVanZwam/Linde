import { stepCountIs, streamText, tool } from 'ai'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { chatModules, platformLimits, socialPlatforms, type ChatModule } from '~~/shared/platforms'
import { useDb } from '../../db/client'
import { articleDrafts, conversations, messages, outreachCampaigns, outreachSteps, siteArticles, socialAccounts, socialPostTargets, socialPosts } from '../../db/schema'
import { aiConfig, getLanguageModel } from '../ai'
import { brandInstructions, getBrand } from '../brand'
import { duplicateWarning } from '../similarity'
import { id } from '../http'

const chatSchema = z.object({
  module: z.enum(chatModules),
  conversationId: z.string().optional(),
  content: z.string().min(1).max(8000),
  locale: z.enum(['nl', 'en']).default('nl'),
})

export function parseChat(data: unknown) {
  return chatSchema.parse(data)
}

export async function streamChat(userId: string, input: z.infer<typeof chatSchema>) {
  const db = useDb()
  const now = new Date()
  let conversationId = input.conversationId
  if (conversationId) {
    const existing = await db.query.conversations.findFirst({
      where: and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
    })
    if (!existing || existing.module !== input.module) {
      throw createError({ statusCode: 404, statusMessage: 'Gesprek niet gevonden' })
    }
  }
  else {
    conversationId = id()
    await db.insert(conversations).values({
      id: conversationId,
      userId,
      module: input.module,
      title: input.content.slice(0, 80),
      createdAt: now,
      updatedAt: now,
    })
  }
  await db.insert(messages).values({
    id: id(),
    conversationId,
    role: 'user',
    content: input.content,
    createdAt: now,
  })
  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, conversationId))
  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: messages.createdAt,
  })
  const brand = await getBrand(userId)
  const language = input.locale === 'en' ? 'Answer in English.' : 'Antwoord in het Nederlands.'
  const ai = aiConfig()
  const fallback = input.locale === 'en'
    ? 'Done. The result is saved in this module.'
    : 'Klaar. Het resultaat staat in deze module.'
  let saved = false
  async function saveAssistant(content: string) {
    if (saved) return
    saved = true
    await db.insert(messages).values({
      id: id(),
      conversationId: conversationId!,
      role: 'assistant',
      content,
      createdAt: new Date(),
    })
  }
  const result = streamText({
    model: getLanguageModel(),
    maxRetries: ai.tier === 'free' ? 0 : 2,
    instructions: `${language}\n\n${instructions(input.module)}\n\nMerkprofiel:\n${brandInstructions(brand)}`,
    messages: history
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content })),
    tools: toolsFor(userId, input.module, conversationId),
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
    return 'Je stelt social posts voor. Roep proposePost aan zodra de gebruiker een post wil. Pas de tekst per platform aan en vermijd herhaling van eerdere posts uit getRecentPosts. Vraag om een video als het platform YouTube of TikTok is.'
  }
  if (module === 'seo') {
    return 'Je schrijft SEO- en GEO-artikelen. GEO betekent dat het stuk citeerbaar is voor antwoordmachines: heldere entiteiten, definities, FAQ en merkconsistente feiten. Roep saveArticleDraft aan met het volledige artikel. Sluit aan op bestaande artikelen tenzij de gebruiker een nieuw thema vraagt. Publiceer niets zelf naar de website.'
  }
  return 'Je zet een nette acquisitieflow op met voorbeeldmails. Roep saveOutreachPlan aan. De gebruiker levert zelf ontvangers aan. Geen misleiding, geen nepadressen, en elke mail blijft een concept tot de gebruiker die accordeert.'
}

function toolsFor(userId: string, module: ChatModule, conversationId: string) {
  if (module === 'strategy') return {}
  if (module === 'social') return socialTools(userId, conversationId)
  if (module === 'seo') return seoTools(userId, conversationId)
  return outreachTools(userId, conversationId)
}

function socialTools(userId: string, conversationId: string) {
  return {
    getRecentPosts: tool({
      description: 'Lees recente posts van gekoppelde accounts om duplicaten te vermijden.',
      inputSchema: z.object({}),
      execute: async () => {
        const posts = await useDb().query.socialPosts.findMany({
          where: eq(socialPosts.userId, userId),
          orderBy: desc(socialPosts.createdAt),
          limit: 20,
        })
        return posts.map(post => ({ body: post.body.slice(0, 400), status: post.status, source: post.source }))
      },
    }),
    proposePost: tool({
      description: 'Sla een conceptpost op met platformspecifieke tekst.',
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
        const db = useDb()
        const accounts = await db.query.socialAccounts.findMany({ where: eq(socialAccounts.userId, userId) })
        const recent = await db.query.socialPosts.findMany({
          where: eq(socialPosts.userId, userId),
          orderBy: desc(socialPosts.createdAt),
          limit: 30,
        })
        const warning = duplicateWarning(input.body, recent.map(post => post.body))
        const postId = id()
        const now = new Date()
        await db.insert(socialPosts).values({
          id: postId,
          userId,
          conversationId,
          body: input.body,
          status: 'draft',
          source: 'local',
          duplicateWarning: warning,
          createdAt: now,
          updatedAt: now,
        })
        const missing: string[] = []
        for (const target of input.targets) {
          const account = accounts.find(item => item.platform === target.platform)
          if (!account) {
            missing.push(target.platform)
            continue
          }
          const limit = platformLimits[target.platform]
          await db.insert(socialPostTargets).values({
            id: id(),
            postId,
            accountId: account.id,
            platform: target.platform,
            body: target.body.slice(0, limit.body),
            title: target.title?.slice(0, limit.title || 150) || null,
            status: 'draft',
          })
        }
        return { postId, duplicateWarning: warning, missingPlatforms: missing, imagePrompt: input.imagePrompt || null }
      },
    }),
  }
}

function seoTools(userId: string, conversationId: string) {
  return {
    listArticles: tool({
      description: 'Toon artikelen die al op de site staan.',
      inputSchema: z.object({}),
      execute: async () => {
        const articles = await useDb().query.siteArticles.findMany({ where: eq(siteArticles.userId, userId) })
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
        const draftId = id()
        const now = new Date()
        await useDb().insert(articleDrafts).values({
          id: draftId,
          userId,
          conversationId,
          title: input.title,
          slug: input.slug,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          markdown: input.markdown,
          faqJson: JSON.stringify(input.faq),
          jsonLd: JSON.stringify(input.jsonLd),
          keywordsJson: JSON.stringify(input.keywords),
          internalLinksJson: JSON.stringify(input.internalLinks),
          geoNotes: input.geoNotes,
          createdAt: now,
          updatedAt: now,
        })
        return { draftId, title: input.title }
      },
    }),
  }
}

function outreachTools(userId: string, conversationId: string) {
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
        const campaignId = id()
        const now = new Date()
        const db = useDb()
        await db.insert(outreachCampaigns).values({
          id: campaignId,
          userId,
          conversationId,
          name: input.name,
          goal: input.goal,
          audience: input.audience,
          offer: input.offer,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        })
        for (const [index, step] of input.steps.entries()) {
          await db.insert(outreachSteps).values({
            id: id(),
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
