import { refreshRecentMetrics } from '../../utils/social/metrics'

export default defineTask({
  meta: {
    name: 'social:metrics',
    description: 'Ververst prestatiecijfers van geplaatste social posts',
  },
  async run() {
    const result = await refreshRecentMetrics()
    return { result }
  },
})
