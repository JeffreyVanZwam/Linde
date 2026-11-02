export type DossierScore = {
  score: number
  note: string
}

export type DossierFix = {
  theme: string
  recommendation: string
  prompt: string
}

export type DossierIcp = {
  name: string
  dive: string
}

export type DossierRival = {
  name: string
  note: string
}

export type DossierMatrixRow = {
  name: string
  offer: string
  pricing: string
  difference: string
}

export type BrandDossier = {
  growthAudit: {
    website: {
      siteAudit: {
        audienceScope: string
        gutReaction: string
        spotlightCompetitors: string
      }
      scores: {
        positioning: DossierScore
        conversionClarity: DossierScore
        trustSignals: DossierScore
        paywallAndPricing: DossierScore
        seoBasics: DossierScore
        briefFit: DossierScore
      }
      quickWins: string[]
      thisQuarter: string[]
    }
    seo: {
      scores: {
        crawlability: DossierScore
        pageClarity: DossierScore
        quotability: DossierScore
        authorship: DossierScore
      }
      fixes: DossierFix[]
    }
    listing: {
      summary: string
      actionPlan: {
        distributionPlays: string
        quickWins: string
        founderTrustUpgrades: string
        biggerBets: string
        postInstallSignals: string
        notYetPlanned: string
      }
    }
  }
  foundation: {
    brief: {
      geo: {
        url: string
        scope: string
        operator: string
      }
      oneLiner: string
      category: string
      hero: string
      pricing: string
      features: string[]
      icpSignals: string
      trustSpine: string
      tone: string
    }
    audience: {
      summary: {
        whoHasProblem: string
        whoPays: string
        dominantPain: string
        objection: string
        dominantTrigger: string
        evidenceCaveat: string
      }
      segmentation: string
      topIcps: DossierIcp[]
      voice: string[]
      themes: string[]
      antiPatterns: string[]
    }
    competitors: {
      summary: {
        categoryStatement: string
        marketLandscape: string
        dominantValueProp: string
        dominantPricingModel: string
        positionsToOwn: string
      }
      matrix: DossierMatrixRow[]
      spotlight: string
      deepDive: DossierRival[]
      otherRivals: DossierRival[]
      whereWeWin: string
    }
  }
}

export const dossierPillars = ['growthAudit', 'foundation'] as const
export type DossierPillar = (typeof dossierPillars)[number]

export const dossierGroups = {
  growthAudit: ['website', 'seo', 'listing'],
  foundation: ['brief', 'audience', 'competitors'],
} as const

export type DossierGroup = (typeof dossierGroups)[DossierPillar][number]

const score = (): DossierScore => ({ score: 0, note: '' })

export function emptyDossier(url = ''): BrandDossier {
  return {
    growthAudit: {
      website: {
        siteAudit: { audienceScope: '', gutReaction: '', spotlightCompetitors: '' },
        scores: {
          positioning: score(),
          conversionClarity: score(),
          trustSignals: score(),
          paywallAndPricing: score(),
          seoBasics: score(),
          briefFit: score(),
        },
        quickWins: [],
        thisQuarter: [],
      },
      seo: {
        scores: {
          crawlability: score(),
          pageClarity: score(),
          quotability: score(),
          authorship: score(),
        },
        fixes: [],
      },
      listing: {
        summary: '',
        actionPlan: {
          distributionPlays: '',
          quickWins: '',
          founderTrustUpgrades: '',
          biggerBets: '',
          postInstallSignals: '',
          notYetPlanned: '',
        },
      },
    },
    foundation: {
      brief: {
        geo: { url, scope: '', operator: '' },
        oneLiner: '',
        category: '',
        hero: '',
        pricing: '',
        features: [],
        icpSignals: '',
        trustSpine: '',
        tone: '',
      },
      audience: {
        summary: {
          whoHasProblem: '',
          whoPays: '',
          dominantPain: '',
          objection: '',
          dominantTrigger: '',
          evidenceCaveat: '',
        },
        segmentation: '',
        topIcps: [{ name: '', dive: '' }, { name: '', dive: '' }, { name: '', dive: '' }],
        voice: [],
        themes: [],
        antiPatterns: [],
      },
      competitors: {
        summary: {
          categoryStatement: '',
          marketLandscape: '',
          dominantValueProp: '',
          dominantPricingModel: '',
          positionsToOwn: '',
        },
        matrix: [],
        spotlight: '',
        deepDive: [],
        otherRivals: [],
        whereWeWin: '',
      },
    },
  }
}

function strings(value: unknown[]) {
  return value.filter((item): item is string => typeof item === 'string')
}

function records<K extends string>(value: unknown[], keys: K[]) {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const source = item as Record<string, unknown>
    const row = {} as Record<K, string>
    for (const key of keys) row[key] = typeof source[key] === 'string' ? source[key] : ''
    return [row]
  })
}

function assignText(target: Record<string, unknown>, patch: unknown, keys: string[]) {
  if (!patch || typeof patch !== 'object') return
  const source = patch as Record<string, unknown>
  for (const key of keys) {
    if (typeof source[key] === 'string') target[key] = source[key]
  }
}

function scoreOf(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  if (!Number.isFinite(parsed)) return null
  return Math.min(10, Math.max(0, Math.round(parsed)))
}

function assignScores<T extends Record<string, DossierScore>>(target: T, patch: unknown, keys: (keyof T)[]) {
  if (!patch || typeof patch !== 'object') return
  const source = patch as Record<string, unknown>
  for (const key of keys) {
    const item = source[String(key)]
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const current = target[key]
    if (!current) continue
    const note = (item as { note?: unknown }).note
    const next = scoreOf((item as { score?: unknown }).score)
    if (typeof note === 'string') current.note = note
    if (next !== null) current.score = next
  }
}

function padIcps(icps: DossierIcp[]) {
  const next = icps.slice(0, 3)
  while (next.length < 3) next.push({ name: '', dive: '' })
  return next
}

export function coerceDossier(patch: unknown, base?: BrandDossier): BrandDossier {
  const current = structuredClone(base ?? emptyDossier())
  if (!patch || typeof patch !== 'object') {
    current.foundation.audience.topIcps = padIcps(current.foundation.audience.topIcps)
    return current
  }
  const source = patch as {
    growthAudit?: {
      website?: { siteAudit?: unknown, scores?: unknown, quickWins?: unknown, thisQuarter?: unknown }
      seo?: { scores?: unknown, fixes?: unknown }
      listing?: { summary?: unknown, actionPlan?: unknown }
    }
    foundation?: {
      brief?: { geo?: unknown, features?: unknown } & Record<string, unknown>
      audience?: { summary?: unknown, segmentation?: unknown, topIcps?: unknown, voice?: unknown, themes?: unknown, antiPatterns?: unknown }
      competitors?: { summary?: unknown, matrix?: unknown, spotlight?: unknown, deepDive?: unknown, otherRivals?: unknown, whereWeWin?: unknown }
    }
  }
  const website = source.growthAudit?.website
  const seo = source.growthAudit?.seo
  const listing = source.growthAudit?.listing
  const brief = source.foundation?.brief
  const audience = source.foundation?.audience
  const competitors = source.foundation?.competitors

  if (website) {
    assignText(current.growthAudit.website.siteAudit, website.siteAudit, ['audienceScope', 'gutReaction', 'spotlightCompetitors'])
    assignScores(current.growthAudit.website.scores, website.scores, ['positioning', 'conversionClarity', 'trustSignals', 'paywallAndPricing', 'seoBasics', 'briefFit'])
    if (Array.isArray(website.quickWins)) current.growthAudit.website.quickWins = strings(website.quickWins)
    if (Array.isArray(website.thisQuarter)) current.growthAudit.website.thisQuarter = strings(website.thisQuarter)
  }
  if (seo) {
    assignScores(current.growthAudit.seo.scores, seo.scores, ['crawlability', 'pageClarity', 'quotability', 'authorship'])
    if (Array.isArray(seo.fixes)) current.growthAudit.seo.fixes = records(seo.fixes, ['theme', 'recommendation', 'prompt'])
  }
  if (listing) {
    if (typeof listing.summary === 'string') current.growthAudit.listing.summary = listing.summary
    assignText(current.growthAudit.listing.actionPlan, listing.actionPlan, ['distributionPlays', 'quickWins', 'founderTrustUpgrades', 'biggerBets', 'postInstallSignals', 'notYetPlanned'])
  }
  if (brief) {
    assignText(current.foundation.brief.geo, brief.geo, ['url', 'scope', 'operator'])
    assignText(current.foundation.brief, brief, ['oneLiner', 'category', 'hero', 'pricing', 'icpSignals', 'trustSpine', 'tone'])
    if (Array.isArray(brief.features)) current.foundation.brief.features = strings(brief.features)
  }
  if (audience) {
    assignText(current.foundation.audience.summary, audience.summary, ['whoHasProblem', 'whoPays', 'dominantPain', 'objection', 'dominantTrigger', 'evidenceCaveat'])
    if (typeof audience.segmentation === 'string') current.foundation.audience.segmentation = audience.segmentation
    if (Array.isArray(audience.topIcps)) current.foundation.audience.topIcps = records(audience.topIcps, ['name', 'dive'])
    if (Array.isArray(audience.voice)) current.foundation.audience.voice = strings(audience.voice)
    if (Array.isArray(audience.themes)) current.foundation.audience.themes = strings(audience.themes)
    if (Array.isArray(audience.antiPatterns)) current.foundation.audience.antiPatterns = strings(audience.antiPatterns)
  }
  if (competitors) {
    assignText(current.foundation.competitors.summary, competitors.summary, ['categoryStatement', 'marketLandscape', 'dominantValueProp', 'dominantPricingModel', 'positionsToOwn'])
    if (Array.isArray(competitors.matrix)) current.foundation.competitors.matrix = records(competitors.matrix, ['name', 'offer', 'pricing', 'difference'])
    if (typeof competitors.spotlight === 'string') current.foundation.competitors.spotlight = competitors.spotlight
    if (Array.isArray(competitors.deepDive)) current.foundation.competitors.deepDive = records(competitors.deepDive, ['name', 'note'])
    if (Array.isArray(competitors.otherRivals)) current.foundation.competitors.otherRivals = records(competitors.otherRivals, ['name', 'note'])
    if (typeof competitors.whereWeWin === 'string') current.foundation.competitors.whereWeWin = competitors.whereWeWin
  }
  current.foundation.audience.topIcps = padIcps(current.foundation.audience.topIcps)
  return current
}

export function legacyFromDossier(dossier: BrandDossier) {
  const brief = dossier.foundation.brief
  const audience = dossier.foundation.audience.summary
  const features = brief.features.map(item => item.trim()).filter(Boolean).join('\n')
  return {
    companyName: brief.geo.operator.trim(),
    whoTheyAre: [brief.oneLiner, brief.category].map(item => item.trim()).filter(Boolean).join(' — '),
    whatTheyDo: [brief.hero, features].map(item => item.trim()).filter(Boolean).join('\n\n'),
    audience: [audience.whoHasProblem, audience.whoPays, audience.dominantPain].map(item => item.trim()).filter(Boolean).join('\n'),
    toneOfVoice: brief.tone.trim(),
  }
}

export function dossierFromLegacy(input: {
  websiteUrl?: string | null
  companyName?: string | null
  whoTheyAre?: string | null
  whatTheyDo?: string | null
  audience?: string | null
  toneOfVoice?: string | null
  dossier?: unknown
}) {
  const url = input.websiteUrl || ''
  const dossier = coerceDossier(input.dossier, emptyDossier(url))
  if (!input.dossier) {
    dossier.foundation.brief.geo.url = url
    dossier.foundation.brief.geo.operator = input.companyName || ''
    dossier.foundation.brief.oneLiner = input.whoTheyAre || ''
    dossier.foundation.brief.hero = input.whatTheyDo || ''
    dossier.foundation.brief.tone = input.toneOfVoice || ''
    dossier.foundation.audience.summary.whoHasProblem = input.audience || ''
  }
  if (!dossier.foundation.brief.geo.url) dossier.foundation.brief.geo.url = url
  return dossier
}
