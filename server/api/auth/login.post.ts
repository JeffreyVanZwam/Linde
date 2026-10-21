import { z } from 'zod'
import { setAuthCookie, toAuthUser } from '../../utils/auth'
import { apiError, parseInput } from '../../utils/http'
import { createPb } from '../../utils/pb'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default defineEventHandler(async (event) => {
  const input = parseInput(schema, await readBody(event))
  const pb = createPb()
  try {
    const auth = await pb.collection('users').authWithPassword(input.email, input.password)
    setAuthCookie(event, auth.token)
    return { token: auth.token, user: toAuthUser(auth.record) }
  }
  catch {
    apiError(401, 'Onjuist e-mailadres of wachtwoord')
  }
})
