import { sendDueOutreach } from '../../utils/outreach/dispatch'

export default defineTask({
  meta: {
    name: 'outreach:send',
    description: 'Verstuurt geaccordeerde outreach-mails',
  },
  async run() {
    const result = await sendDueOutreach()
    return { result }
  },
})