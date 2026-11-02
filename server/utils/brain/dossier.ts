import { generateObject } from 'ai'
import { z } from 'zod'
import { coerceDossier, emptyDossier, type BrandDossier } from '~~/shared/dossier'
import { aiConfig, getLanguageModel, hasLanguageModel } from '../ai'

function finding(detail = 'Short finding, a few sentences') {
  return z.object({
    score: z.number().describe('Integer from 0 to 10'),
    note: z.string().describe(detail),
  })
}

const growthSchema = z.object({
  website: z.object({
    siteAudit: z.object({
      audienceScope: z.string().describe('Who the site addresses and how wide that audience is'),
      gutReaction: z.string().describe('Immediate reaction to the page: clarity, offer, friction'),
      spotlightCompetitors: z.string().describe('Competitors the page itself puts in the spotlight, or the closest obvious set'),
    }),
    scores: z.object({
      positioning: finding(),
      conversionClarity: finding(),
      trustSignals: finding('Trust signals and social proof'),
      paywallAndPricing: finding(),
      seoBasics: finding(),
      briefFit: finding('How well the page matches a clear product brief'),
    }),
    quickWins: z.array(z.string()).max(8).describe('Small changes to do first'),
    thisQuarter: z.array(z.string()).max(8).describe('Work that belongs in this quarter'),
  }),
  seo: z.object({
    scores: z.object({
      crawlability: finding(),
      pageClarity: finding(),
      quotability: finding('How easy the page is to quote, including for answer engines'),
      authorship: finding(),
    }),
    fixes: z.array(z.object({
      theme: z.string(),
      recommendation: z.string(),
      prompt: z.string().describe('Self-contained prompt a developer can paste into an IDE or code editor'),
    })).max(6),
  }),
  listing: z.object({
    summary: z.string().describe('How the product should read in directories, marketplaces and other listings'),
    actionPlan: z.object({
      distributionPlays: z.string(),
      quickWins: z.string(),
      founderTrustUpgrades: z.string(),
      biggerBets: z.string(),
      postInstallSignals: z.string().describe('Post-install signals to monitor'),
      notYetPlanned: z.string(),
    }),
  }),
})

const foundationSchema = z.object({
  brief: z.object({
    geo: z.object({
      url: z.string(),
      scope: z.string().describe('Assumed geographic market'),
      operator: z.string().describe('Company operating the site'),
    }),
    oneLiner: z.string(),
    category: z.string(),
    hero: z.string().describe('Main headline copied verbatim from the page'),
    pricing: z.string(),
    features: z.array(z.string()).max(10),
    icpSignals: z.string(),
    trustSpine: z.string().describe('The spine of proof: customers, credentials, guarantees'),
    tone: z.string().describe('Concrete tone of voice a copywriter can reuse'),
  }),
  audience: z.object({
    summary: z.object({
      whoHasProblem: z.string(),
      whoPays: z.string(),
      dominantPain: z.string(),
      objection: z.string(),
      dominantTrigger: z.string(),
      evidenceCaveat: z.string().describe('What the page does not prove'),
    }),
    segmentation: z.string(),
    topIcps: z.array(z.object({
      name: z.string(),
      dive: z.string(),
    })).max(3),
    voice: z.array(z.string()).max(6).describe('Lines in the buyer\'s words'),
    themes: z.array(z.string()).max(8),
    antiPatterns: z.array(z.string()).max(8),
  }),
  competitors: z.object({
    summary: z.object({
      categoryStatement: z.string(),
      marketLandscape: z.string(),
      dominantValueProp: z.string(),
      dominantPricingModel: z.string(),
      positionsToOwn: z.string(),
    }),
    matrix: z.array(z.object({
      name: z.string(),
      offer: z.string(),
      pricing: z.string(),
      difference: z.string(),
    })).max(6),
    spotlight: z.string().describe('Two rivals compared side by side'),
    deepDive: z.array(z.object({ name: z.string(), note: z.string() })).max(4),
    otherRivals: z.array(z.object({ name: z.string(), note: z.string() })).max(6),
    whereWeWin: z.string().describe('Where this company can credibly win'),
  }),
})

type PageContext = {
  locale: 'nl' | 'en'
  url: string
  title: string
  description: string
  text: string
}

async function ask<T>(schema: z.ZodType<T>, prompt: string): Promise<T | undefined> {
  if (!hasLanguageModel()) return undefined
  try {
    const ai = aiConfig()
    const { object } = await generateObject({
      model: getLanguageModel(),
      maxRetries: ai.tier === 'free' ? 0 : 2,
      schema,
      abortSignal: AbortSignal.timeout(45_000),
      prompt,
    })
    return object
  }
  catch {
    return undefined
  }
}

function context(input: PageContext) {
  const language = input.locale === 'en'
    ? 'Write every string in English.'
    : 'Schrijf elke tekst in het Nederlands.'
  return [
    language,
    'Use only what this website supports. When you infer, start that string with "Assumed:" or "Aangenomen:".',
    'Do not invent customers, prices or competitors. If a fact is missing, leave the string empty.',
    `URL: ${input.url}`,
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    `Text:\n${input.text.slice(0, 10_000)}`,
  ].join('\n\n')
}

export async function generateDossier(input: PageContext, fallbackName: string): Promise<BrandDossier> {
  const shared = context(input)
  const [growth, foundation] = await Promise.all([
    ask(growthSchema, [
      'Build the growth-audit half of an onboarding dossier.',
      'Scores are from 0 to 10. Quick wins and this-quarter items are short imperative lines.',
      'Each SEO fix belongs to one theme. Its prompt must be self-contained enough to paste into an IDE or code editor.',
      'Listing optimization is about directories, marketplaces and other places the product is summarized.',
      shared,
    ].join('\n\n')),
    ask(foundationSchema, [
      'Build the foundation half of an onboarding dossier: product brief, audience and competitors.',
      'The hero must be the main headline verbatim from the page, not a paraphrase.',
      'Operator is the company behind the site. Geo scope is the assumed country or region.',
      'Return up to three ICPs. Voice-of-customer lines sound like a buyer.',
      'whereWeWin only includes positions this company can credibly claim.',
      shared,
    ].join('\n\n')),
  ])
  const dossier = coerceDossier({
    growthAudit: growth,
    foundation,
  }, emptyDossier(input.url))
  dossier.foundation.brief.geo.url = input.url
  if (!dossier.foundation.brief.geo.operator.trim()) dossier.foundation.brief.geo.operator = fallbackName
  if (!dossier.foundation.brief.hero.trim() && input.description.trim()) dossier.foundation.brief.hero = input.description.trim()
  return dossier
}
