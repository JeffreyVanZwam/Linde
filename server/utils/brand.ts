import { parseJson } from './http'
import type { BrandRow } from './rows'
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
  }
}

export async function getBrand(userId: string) {
  const row = await findBrand(userId)
  return row ? toBrandView(row) : null
}

export async function saveBrand(userId: string, input: Partial<BrandView> & { onboardingCompleted?: boolean }) {
  const existing = await findBrand(userId)
  const current = existing ? toBrandView(existing) : null
  await saveBrandRecord(userId, existing, {
    websiteUrl: input.websiteUrl ?? current?.websiteUrl ?? null,
    companyName: input.companyName ?? current?.companyName ?? null,
    logoMediaId: input.logoMediaId ?? current?.logoMediaId ?? null,
    imageIds: input.imageIds ?? current?.imageIds ?? [],
    colors: input.colors ?? current?.colors ?? [],
    fonts: input.fonts ?? current?.fonts ?? [],
    whoTheyAre: input.whoTheyAre ?? current?.whoTheyAre ?? null,
    whatTheyDo: input.whatTheyDo ?? current?.whatTheyDo ?? null,
    audience: input.audience ?? current?.audience ?? null,
    toneOfVoice: input.toneOfVoice ?? current?.toneOfVoice ?? null,
    articlesUrl: input.articlesUrl ?? current?.articlesUrl ?? null,
    onboardingCompleted: input.onboardingCompleted ?? current?.onboardingCompleted ?? false,
  })
  return getBrand(userId)
}

export function brandInstructions(brand: BrandView | null) {
  if (!brand) return 'Er is nog geen merkprofiel.'
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
  ].join('\n')
}
