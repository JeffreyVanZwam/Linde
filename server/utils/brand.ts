import { coerceDossier, legacyFromDossier, type BrandDossier } from '~~/shared/dossier'
import { parseJson } from './http'
import type { BrandRow, WritingRule } from './rows'
import { findBrand, saveBrandRecord } from './store'

export type BrandView = {
  id: string
  websiteUrl: string | null
  companyName: string | null
  logoMediaId: string | null
  imageIds: string[]
  colors: string[]
  fonts: string[]
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  articlesUrl: string | null
  onboardingCompleted: boolean
  dossier: BrandDossier | null
  color: string
  position: number
  archived: boolean
  writingRules: WritingRule[]
}

export function toBrandView(row: BrandRow): BrandView {
  return {
    id: row.id,
    websiteUrl: row.websiteUrl,
    companyName: row.companyName,
    logoMediaId: row.logoMediaId,
    imageIds: parseJson<string[]>(row.imageIdsJson, []),
    colors: parseJson<string[]>(row.colorsJson, []),
    fonts: parseJson<string[]>(row.fontsJson, []),
    whoTheyAre: row.whoTheyAre,
    whatTheyDo: row.whatTheyDo,
    audience: row.audience,
    toneOfVoice: row.toneOfVoice,
    articlesUrl: row.articlesUrl,
    onboardingCompleted: row.onboardingCompleted,
    dossier: readDossier(row.dossierJson),
    color: row.color,
    position: row.position,
    archived: row.archived,
    writingRules: parseJson<WritingRule[]>(row.writingRulesJson, []).filter(rule => rule && typeof rule.text === 'string'),
  }
}

function readDossier(raw: string) {
  const parsed = parseJson<unknown>(raw, null)
  if (!parsed || typeof parsed !== 'object') return null
  return coerceDossier(parsed)
}

export async function getBrand(userId: string) {
  const row = await findBrand(userId)
  return row ? toBrandView(row) : null
}

export async function saveBrand(userId: string, input: Partial<Omit<BrandView, 'dossier'>> & { dossier?: unknown, onboardingCompleted?: boolean }) {
  const existing = await findBrand(userId)
  const current = existing ? toBrandView(existing) : null
  const dossier = input.dossier !== undefined
    ? coerceDossier(input.dossier, current?.dossier ?? undefined)
    : current?.dossier ?? null
  const dossierUrl = input.dossier !== undefined ? dossier?.foundation.brief.geo.url.trim() : ''
  const websiteUrl = dossierUrl || input.websiteUrl || current?.websiteUrl || null
  if (dossier && websiteUrl && !dossier.foundation.brief.geo.url) dossier.foundation.brief.geo.url = websiteUrl
  const derived = input.dossier !== undefined && dossier ? legacyFromDossier(dossier) : null
  await saveBrandRecord(userId, existing, {
    websiteUrl,
    companyName: derived ? (derived.companyName || input.companyName || current?.companyName || null) : (input.companyName ?? current?.companyName ?? null),
    logoMediaId: input.logoMediaId ?? current?.logoMediaId ?? null,
    imageIds: input.imageIds ?? current?.imageIds ?? [],
    colors: input.colors ?? current?.colors ?? [],
    fonts: input.fonts ?? current?.fonts ?? [],
    whoTheyAre: derived ? derived.whoTheyAre : (input.whoTheyAre ?? current?.whoTheyAre ?? null),
    whatTheyDo: derived ? derived.whatTheyDo : (input.whatTheyDo ?? current?.whatTheyDo ?? null),
    audience: derived ? derived.audience : (input.audience ?? current?.audience ?? null),
    toneOfVoice: derived ? derived.toneOfVoice : (input.toneOfVoice ?? current?.toneOfVoice ?? null),
    articlesUrl: input.articlesUrl ?? current?.articlesUrl ?? null,
    onboardingCompleted: input.onboardingCompleted ?? current?.onboardingCompleted ?? false,
    dossier,
  })
  return getBrand(userId)
}

export function brandInstructions(brand: BrandView | null, notes: Array<{ kind: string, title: string, body: string }> = []) {
  if (!brand) return 'Er is nog geen merkprofiel.'
  const rules = brand.writingRules.filter(rule => rule.enabled && rule.text.trim())
  const knowledge = notes.filter(note => note.body.trim()).slice(0, 12)
  return [
    `Bedrijf: ${brand.companyName || 'onbekend'}`,
    `Website: ${brand.websiteUrl || 'onbekend'}`,
    `Wie ze zijn: ${brand.whoTheyAre || 'onbekend'}`,
    `Wat ze doen: ${brand.whatTheyDo || 'onbekend'}`,
    `Doelgroep: ${brand.audience || 'onbekend'}`,
    `Tone of voice: ${brand.toneOfVoice || 'onbekend'}`,
    `Kleuren: ${brand.colors.join(', ') || 'onbekend'}`,
    `Fonts: ${brand.fonts.join(', ') || 'onbekend'}`,
    `Artikelen-URL: ${brand.articlesUrl || 'niet ingesteld'}`,
    brand.dossier ? dossierBrief(brand.dossier) : '',
    rules.length ? `Schrijfregels voor social posts:\n${rules.map(rule => `- ${rule.text}`).join('\n')}` : '',
    knowledge.length ? `Kennis en stem van dit merk:\n${knowledge.map(note => `${note.kind}: ${note.title}\n${clip(note.body, 700)}`).join('\n\n')}` : '',
  ].filter(Boolean).join('\n').slice(0, 14_000)
}

function clip(value: string, max = 400) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function scoreLine(label: string, item: { score: number, note: string }) {
  return item.note.trim() ? `${label} (${item.score}/10): ${clip(item.note, 240)}` : ''
}

function dossierBrief(dossier: BrandDossier) {
  const website = dossier.growthAudit.website
  const seo = dossier.growthAudit.seo
  const listing = dossier.growthAudit.listing
  const brief = dossier.foundation.brief
  const audience = dossier.foundation.audience
  const competitors = dossier.foundation.competitors
  return [
    `Operator: ${brief.geo.operator}`,
    `URL: ${brief.geo.url}`,
    `Geo: ${brief.geo.scope}`,
    `Oneliner: ${brief.oneLiner}`,
    `Categorie: ${brief.category}`,
    `Hero: ${clip(brief.hero)}`,
    `Prijzen: ${clip(brief.pricing)}`,
    `Functies: ${brief.features.filter(Boolean).join('; ')}`,
    `ICP-signalen: ${clip(brief.icpSignals)}`,
    `Vertrouwensbasis: ${clip(brief.trustSpine, 300)}`,
    `Toon: ${clip(brief.tone, 300)}`,
    `Wie het probleem heeft: ${audience.summary.whoHasProblem}`,
    `Wie betaalt: ${audience.summary.whoPays}`,
    `Pijn: ${audience.summary.dominantPain}`,
    `Bezwaar: ${audience.summary.objection}`,
    `Aanleiding: ${audience.summary.dominantTrigger}`,
    `Voorbehoud: ${audience.summary.evidenceCaveat}`,
    `Segmentatie: ${clip(audience.segmentation)}`,
    ...audience.topIcps.filter(icp => icp.name.trim() || icp.dive.trim()).map(icp => `ICP ${icp.name}: ${clip(icp.dive, 300)}`),
    `Stem van de klant: ${audience.voice.filter(Boolean).join(' | ')}`,
    `Thema's: ${audience.themes.filter(Boolean).join('; ')}`,
    `Antipatronen: ${audience.antiPatterns.filter(Boolean).join('; ')}`,
    `Categoriestelling: ${competitors.summary.categoryStatement}`,
    `Landschap: ${clip(competitors.summary.marketLandscape)}`,
    `Waardepropositie: ${competitors.summary.dominantValueProp}`,
    `Prijsmodel: ${competitors.summary.dominantPricingModel}`,
    `Posities: ${competitors.summary.positionsToOwn}`,
    `Winnen: ${clip(competitors.whereWeWin)}`,
    `Site-audit: ${clip([website.siteAudit.audienceScope, website.siteAudit.gutReaction, website.siteAudit.spotlightCompetitors].filter(Boolean).join(' '), 500)}`,
    scoreLine('Positionering', website.scores.positioning),
    scoreLine('Conversie', website.scores.conversionClarity),
    scoreLine('Vertrouwen', website.scores.trustSignals),
    scoreLine('Prijzen op de site', website.scores.paywallAndPricing),
    scoreLine('SEO-basis', website.scores.seoBasics),
    scoreLine('Brief', website.scores.briefFit),
    `Snelle winsten: ${website.quickWins.filter(Boolean).join('; ')}`,
    `Dit kwartaal: ${website.thisQuarter.filter(Boolean).join('; ')}`,
    scoreLine('Crawlbaarheid', seo.scores.crawlability),
    scoreLine('Paginaduidelijkheid', seo.scores.pageClarity),
    scoreLine('Citeerbaarheid', seo.scores.quotability),
    scoreLine('Auteurschap', seo.scores.authorship),
    ...seo.fixes.filter(fix => fix.theme.trim() || fix.recommendation.trim()).map(fix => `SEO ${fix.theme}: ${clip(fix.recommendation, 240)}`),
    `Listing: ${clip(listing.summary)}`,
    `Distributie: ${clip(listing.actionPlan.distributionPlays, 240)}`,
    `Listing, snelle winsten: ${clip(listing.actionPlan.quickWins, 240)}`,
    `Oprichter: ${clip(listing.actionPlan.founderTrustUpgrades, 240)}`,
    `Grotere inzetten: ${clip(listing.actionPlan.biggerBets, 240)}`,
    `Na installatie: ${clip(listing.actionPlan.postInstallSignals, 240)}`,
    `Nog niet gepland: ${clip(listing.actionPlan.notYetPlanned, 240)}`,
  ].filter(line => line.trim() && !/:\s*$/.test(line)).join('\n')
}
