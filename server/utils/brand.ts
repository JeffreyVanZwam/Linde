import { eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { brands } from '../db/schema'
import { id, parseJson } from './http'

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

export function toBrandView(row: typeof brands.$inferSelect): BrandView {
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
  const row = await useDb().query.brands.findFirst({ where: eq(brands.userId, userId) })
  return row ? toBrandView(row) : null
}

export async function saveBrand(userId: string, input: Partial<BrandView> & { onboardingCompleted?: boolean }) {
  const db = useDb()
  const existing = await db.query.brands.findFirst({ where: eq(brands.userId, userId) })
  const now = new Date()
  const values = {
    websiteUrl: input.websiteUrl ?? existing?.websiteUrl ?? null,
    companyName: input.companyName ?? existing?.companyName ?? null,
    logoMediaId: input.logoMediaId ?? existing?.logoMediaId ?? null,
    imageIdsJson: JSON.stringify(input.imageIds ?? parseJson<string[]>(existing?.imageIdsJson, [])),
    colorsJson: JSON.stringify(input.colors ?? parseJson<string[]>(existing?.colorsJson, [])),
    fontsJson: JSON.stringify(input.fonts ?? parseJson<string[]>(existing?.fontsJson, [])),
    whoTheyAre: input.whoTheyAre ?? existing?.whoTheyAre ?? null,
    whatTheyDo: input.whatTheyDo ?? existing?.whatTheyDo ?? null,
    audience: input.audience ?? existing?.audience ?? null,
    toneOfVoice: input.toneOfVoice ?? existing?.toneOfVoice ?? null,
    articlesUrl: input.articlesUrl ?? existing?.articlesUrl ?? null,
    onboardingCompleted: input.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
    updatedAt: now,
  }
  if (existing) {
    await db.update(brands).set(values).where(eq(brands.id, existing.id))
  }
  else {
    await db.insert(brands).values({ id: id(), userId, createdAt: now, ...values })
  }
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
