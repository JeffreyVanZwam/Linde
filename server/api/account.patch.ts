import { z } from 'zod'
import { requireUser, setAuthCookie, toAuthUser } from '../utils/auth'
import { apiError, parseInput } from '../utils/http'
import { createPb } from '../utils/pb'

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  oldPassword: z.string().optional(),
  password: z.string().min(8).max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = parseInput(schema, await readBody(event))
  const token = getCookie(event, 'pb_auth')
  if (!token) apiError(401, 'Niet ingelogd')
  const pb = createPb()
  pb.authStore.save(token)
  const data: Record<string, unknown> = {}
  if (input.name) data.name = input.name
  if (input.password) {
    if (!input.oldPassword) apiError(400, 'Vul je huidige wachtwoord in')
    data.oldPassword = input.oldPassword
    data.password = input.password
    data.passwordConfirm = input.password
  }
  try {
    const record = await pb.collection('users').update(user.id, data)
    if (input.password) {
      const auth = await pb.collection('users').authWithPassword(user.email, input.password)
      setAuthCookie(event, auth.token)
      return { user: toAuthUser(auth.record) }
    }
    return { user: toAuthUser(record) }
  }
  catch {
    apiError(400, 'Account bijwerken mislukte')
  }
})
