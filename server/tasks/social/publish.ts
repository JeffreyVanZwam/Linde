import { publishDuePosts } from '../../utils/social/publish'

export default defineTask({
  meta: {
    name: 'social:publish',
    description: 'Publiceert ingeplande social posts',
  },
  async run() {
    const result = await publishDuePosts()
    return { result }
  },
})
