import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../../db/client'
import { outreachCampaigns, outreachRecipients } from '../../../../db/schema'
import { requireUser } from '../../../../utils/auth'
import { apiError, id, parseInput } from '../../../../utils/http'

const schema = z.object({
  csv: z.string().optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const campaignId = getRouterParam(event, 'id')
  if (!campaignId) apiError(400, 'Campagne ontbreekt')
  const campaign = await useDb().query.outreachCampaigns.findFirst({
    where: and(eq(outreachCampaigns.id, campaignId), eq(outreachCampaigns.userId, user.id)),
  })
  if (!campaign) apiError(404, 'Campagne niet gevonden')
  const input = parseInput(schema, await readBody(event))
  const rows = [
    ...(input.recipients || []),
    ...parseCsv(input.csv || ''),
  ]
  if (!rows.length) apiError(400, 'Geen ontvangers')
  await useDb().insert(outreachRecipients).values(rows.map(row => ({
    id: id(),
    campaignId: campaign.id,
    email: row.email.trim().toLowerCase(),
    name: row.name || null,
    status: 'active',
    currentStep: 0,
  })))
  return { added: rows.length }
})

function parseCsv(csv: string) {
  return csv.split(/\r?\n/).flatMap((line) => {
    const [email, name] = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''))
    if (!email || !email.includes('@') || email.toLowerCase() === 'email') return []
    return [{ email, name }]
  })
}
