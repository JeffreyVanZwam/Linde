import { generateObject } from 'ai'
import { z } from 'zod'
import { coerceDossier, emptyDossier, type BrandDossier } from '~~/shared/dossier'
import { aiConfig, getLanguageModel, hasLanguageModel } from '../ai'

function finding(detail = 'Three to five sentences: what is on the page, why this score, and the specific gap. Name the headline or section you judged.') {
  return z.object({
    score: z.number().describe('Integer from 0 to 10. Use 0 only when the dimension is missing, and explain that in the note.'),
    note: z.string().describe(detail),
  })
}

const line = (detail: string) => z.string().describe(detail)

const growthSchema = z.object({
  website: z.object({
    siteAudit: z.object({
      audienceScope: z.string().describe('A paragraph: who the site addresses, how wide that audience is, and which pages show it'),
      gutReaction: z.string().describe('A paragraph: clarity, offer, and friction in the first screen'),
      spotlightCompetitors: z.string().describe('A paragraph on rivals the site names, or the closest real set if it names none'),
    }),
    scores: z.object({
      positioning: finding(),
      conversionClarity: finding(),
      trustSignals: finding('Trust signals and social proof'),
      paywallAndPricing: finding(),
      seoBasics: finding(),
      briefFit: finding('How well the page matches a clear product brief'),
    }),
    quickWins: z.array(line('Two sentences: the element to change, the change, and why it matters.')).max(8).describe('Six to eight specific actions to do first'),
    thisQuarter: z.array(line('Two sentences: the project, the pages it touches, and the outcome.')).max(6).describe('Four to six projects for this quarter'),
  }),
  seo: z.object({
    scores: z.object({
      crawlability: finding(),
      pageClarity: finding(),
      quotability: finding('How easy the page is to quote, including for answer engines'),
      authorship: finding(),
    }),
    fixes: z.array(z.object({
      theme: z.string().describe('One theme, such as titles, internal links, or authorship'),
      recommendation: z.string().describe('A paragraph: what is wrong, where, and what good looks like'),
      prompt: z.string().describe('A self-contained IDE prompt with context, the change, and acceptance criteria. Several sentences, not a slogan.'),
    })).max(6).describe('Four to six fixes'),
  }),
  listing: z.object({
    summary: z.string().describe('A paragraph on how the product should read in directories, marketplaces and other listings, with the words to lead with'),
    actionPlan: z.object({
      distributionPlays: z.string().describe('A paragraph naming specific channels and why they fit this offer'),
      quickWins: z.string().describe('A paragraph of listing changes that can happen this month'),
      founderTrustUpgrades: z.string().describe('A paragraph on proof the founder or brand still needs in public listings'),
      biggerBets: z.string().describe('A paragraph on larger distribution bets'),
      postInstallSignals: z.string().describe('A paragraph on post-install or post-signup signals to monitor'),
      notYetPlanned: z.string().describe('A paragraph on relevant moves that should wait, and why'),
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
    oneLiner: z.string().describe('One precise sentence a stranger can repeat'),
    category: z.string().describe('The market category, specific enough to name rivals'),
    hero: z.string().describe('Main headline copied verbatim from the page'),
    pricing: z.string().describe('A paragraph: published prices, packaging, and what is missing. Do not invent amounts.'),
    features: z.array(line('One capability, written as a full phrase with the outcome for the buyer')).max(12).describe('Every distinct capability found, up to twelve'),
    icpSignals: z.string().describe('A paragraph of evidence for who the site is for: words, offers, proof, and gaps'),
    trustSpine: z.string().describe('A paragraph on the spine of proof: customers, credentials, guarantees, and what is absent'),
    tone: z.string().describe('Four to six sentences a copywriter can reuse: person, rhythm, vocabulary, and words to avoid'),
  }),
  audience: z.object({
    summary: z.object({
      whoHasProblem: z.string().describe('Three to five sentences on who has the problem'),
      whoPays: z.string().describe('Three to five sentences on who pays, if that differs'),
      dominantPain: z.string().describe('Three to five sentences on the pain the site actually speaks to'),
      objection: z.string().describe('Three to five sentences on the objection a buyer would raise'),
      dominantTrigger: z.string().describe('Three to five sentences on what would make them act'),
      evidenceCaveat: z.string().describe('A paragraph on what the pages do not prove'),
    }),
    segmentation: z.string().describe('A paragraph that separates the segments and how the site treats them'),
    topIcps: z.array(z.object({
      name: z.string().describe('A specific segment name, not "SMB"'),
      dive: z.string().describe('A paragraph: role, pain, trigger, objection, and where they look'),
    })).max(3).describe('Exactly three ICPs'),
    voice: z.array(line('One sentence the buyer would actually say')).max(6).describe('Five or six lines in the buyer\'s words'),
    themes: z.array(line('One content or message theme, with the angle for this brand')).max(8).describe('Six to eight themes'),
    antiPatterns: z.array(line('One pattern this brand should avoid, and why it would sound wrong here')).max(8).describe('Five to eight anti-patterns'),
  }),
  competitors: z.object({
    summary: z.object({
      categoryStatement: z.string().describe('A paragraph that places the company in its category'),
      marketLandscape: z.string().describe('A paragraph on how this market is structured'),
      dominantValueProp: z.string().describe('A paragraph on the value proposition buyers in this category already expect'),
      dominantPricingModel: z.string().describe('A paragraph on how this category usually charges'),
      positionsToOwn: z.string().describe('A paragraph on the positions worth taking'),
    }),
    matrix: z.array(z.object({
      name: z.string().describe('A real company. Prefix with Aangenomen: or Assumed: when the site does not name it'),
      offer: z.string().describe('Two or three sentences on what they sell'),
      pricing: z.string().describe('Two or three sentences on how they charge. Do not invent exact amounts'),
      difference: z.string().describe('Two or three sentences on how this company differs'),
    })).max(6).describe('Four to six rivals'),
    spotlight: z.string().describe('A paragraph comparing two rivals side by side'),
    deepDive: z.array(z.object({
      name: z.string(),
      note: z.string().describe('A paragraph: offer, buyer, and the credible gap versus this company'),
    })).max(4).describe('Three rivals in more depth'),
    otherRivals: z.array(z.object({
      name: z.string(),
      note: z.string().describe('Two sentences on why they sit in the set'),
    })).max(6).describe('Four more rivals'),
    whereWeWin: z.string().describe('A paragraph of positions this company can credibly claim, tied to what the site shows'),
  }),
})

type PageContext = {
  locale: 'nl' | 'en'
  url: string
  title: string
  description: string
  text: string
}

const rules = [
  'Fill every field. An empty string is a failed answer.',
  'Write paragraphs and full sentences, not labels or slogans. A score note is three to five sentences.',
  'Ground claims in the supplied pages and name the headline or section you used.',
  'When you infer, start that sentence with "Aangenomen:" or "Assumed:".',
  'Do not invent named customers, testimonials, or exact prices. If they are missing, say so and describe the likely pattern, marked as assumed.',
  'Competitors must be real companies. If the site names none, choose the closest real alternatives and prefix the name with "Aangenomen:" or "Assumed:".',
].join('\n')

async function ask<T>(schema: z.ZodType<T>, prompt: string): Promise<T | undefined> {
  if (!hasLanguageModel()) return undefined
  const ai = aiConfig()
  let extra = ''
  let draft: T | undefined
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { object } = await generateObject({
        model: getLanguageModel(),
        maxRetries: ai.tier === 'free' ? 1 : 2,
        schema,
        abortSignal: AbortSignal.timeout(70_000),
        prompt: extra ? `${prompt}\n\n${extra}` : prompt,
      })
      if (attempt === 0 && sparse(object)) {
        draft = object
        extra = 'The previous draft was too short or left fields empty. Rewrite the full object. Every field needs a specific, complete answer.'
        continue
      }
      return object
    }
    catch {
      extra = 'Return the full object. Fill every field with a complete answer. Do not leave strings empty.'
    }
  }
  return draft
}

function collectText(value: unknown, into: string[]) {
  if (typeof value === 'string') {
    into.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, into)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectText(item, into)
  }
}

function sparse(value: unknown) {
  const texts: string[] = []
  collectText(value, texts)
  if (texts.length < 4) return true
  const blank = texts.filter(item => item.trim().length === 0).length
  const average = texts.reduce((sum, item) => sum + item.trim().length, 0) / texts.length
  return blank / texts.length > 0.1 || average < 80
}

function context(input: PageContext) {
  const language = input.locale === 'en'
    ? 'Write every string in English.'
    : 'Schrijf elke tekst in het Nederlands.'
  return [
    language,
    rules,
    `URL: ${input.url}`,
    `Title: ${input.title}`,
    `Description: ${input.description}`,
    `Pages:\n${input.text.slice(0, 28_000)}`,
  ].join('\n\n')
}

async function mapPool<T>(jobs: Array<() => Promise<T>>, limit: number) {
  const results = new Array<T>(jobs.length)
  let cursor = 0
  async function run() {
    while (cursor < jobs.length) {
      const index = cursor
      cursor += 1
      results[index] = await jobs[index]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, () => run()))
  return results
}

export async function generateDossier(input: PageContext, fallbackName: string): Promise<BrandDossier> {
  if (!hasLanguageModel()) {
    throw createError({ statusCode: 400, statusMessage: 'Er is geen taalmodel ingesteld voor de analyse.' })
  }
  const shared = context(input)
  const [website, seo, listing, brief, audience, competitors] = await mapPool([
    () => ask(growthSchema.shape.website, [
      'Write the website-optimization section of a growth audit.',
      'Cover who the site is for, the first impression, scores, quick wins, and this quarter.',
      'Quick wins and quarter items name the page element they change.',
      shared,
    ].join('\n\n')),
    () => ask(growthSchema.shape.seo, [
      'Write the SEO section of a growth audit: crawlability, page clarity, quotability, and authorship.',
      'Each fix has one theme, a paragraph of advice, and an IDE prompt a developer can paste without more context.',
      shared,
    ].join('\n\n')),
    () => ask(growthSchema.shape.listing, [
      'Write the listing-optimization section: how this offer should read in directories, marketplaces, and other summaries.',
      'Every action-plan field is its own paragraph with specific channels.',
      shared,
    ].join('\n\n')),
    () => ask(foundationSchema.shape.brief, [
      'Write the product brief.',
      'The hero is the main headline verbatim. If you cannot find one, use the closest H1 and start with "Aangenomen:" or "Assumed:".',
      'Operator is the company behind the site. Geo scope is the country or region, marked as assumed when the site does not state it.',
      'List every distinct capability you can support from the pages.',
      shared,
    ].join('\n\n')),
    () => ask(foundationSchema.shape.audience, [
      'Write the audience section: who has the problem, who pays, pain, objection, trigger, segments, three ICPs, buyer language, themes, and anti-patterns.',
      'Voice lines sound like a buyer, not a marketer.',
      shared,
    ].join('\n\n')),
    () => ask(foundationSchema.shape.competitors, [
      'Write the competitor section.',
      'whereWeWin only includes positions this company can credibly claim from the pages.',
      'Compare real alternatives. Mark any rival the site does not name.',
      shared,
    ].join('\n\n')),
  ], 2)
  const dossier = coerceDossier({
    growthAudit: { website, seo, listing },
    foundation: { brief, audience, competitors },
  }, emptyDossier(input.url))
  dossier.foundation.brief.geo.url = input.url
  if (!dossier.foundation.brief.geo.operator.trim()) dossier.foundation.brief.geo.operator = fallbackName
  if (!dossier.foundation.brief.hero.trim() && input.description.trim()) dossier.foundation.brief.hero = input.description.trim()
  const texts: string[] = []
  collectText(dossier, texts)
  const meaningful = texts.filter(item => item.trim().length >= 40).length
  if (meaningful < 18) {
    throw createError({ statusCode: 502, statusMessage: 'De analyse was te onvolledig en is niet opgeslagen. Probeer het opnieuw.' })
  }
  return dossier
}
