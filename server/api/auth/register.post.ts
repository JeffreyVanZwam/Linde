import { z } from 'zod'
import { setAuthCookie, toAuthUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { createPb, useAdminPb } from '../../utils/pb'

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export default defineEventHandler(async (event) => {
  const input = parseInput(schema, await readBody(event))
  const admin = await useAdminPb()
  const existing = await admin.collection('users').getList(1, 1, { requestKey: null })
  const role = existing.totalItems === 0 ? 'admin' : 'member'
  try {
    await admin.collection('users').create({
      email: input.email,
      emailVisibility: false,
      password: input.password,
      passwordConfirm: input.password,
      verified: true,
      name: input.name,
      role,
    }, { requestKey: null })
  }
  catch {
    apiError(400, 'Registreren mislukte. Gebruik een ander e-mailadres of een langer wachtwoord.')
  }
  const pb = createPb()
  const auth = await pb.collection('users').authWithPassword(input.email, input.password)
  setAuthCookie(event, auth.token)
  return { token: auth.token, user: toAuthUser(auth.record) }
})
