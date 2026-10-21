import { platformLimits, type SocialPlatform } from '~~/shared/platforms'
import { readMediaBytes } from '../media'
import { findMedia, findPost, listDuePosts, listTargetsForPost, updatePost, updateTarget } from '../store'
import { readyAccount } from './accounts'
import { linkedinPublish } from './linkedin'
import { metaPublish } from './meta'
import { tiktokPublish } from './tiktok'
import type { PublishInput } from './types'
import { youtubePublish } from './youtube'

export async function publishDuePosts() {
  const due = await listDuePosts()
  for (const post of due) {
    await publishPost(post.id)
  }
  return { published: due.length }
}

export async function publishPost(postId: string) {
  const post = await findPost(postId)
  if (!post || post.source !== 'local') return
  await updatePost(post.id, { status: 'publishing' })
  const targets = await listTargetsForPost(post.id)
  const media = post.mediaAssetId ? await findMedia(post.mediaAssetId) : null
  const bytes = media ? await readMediaBytes(media.id) : null
  let failed = false
  for (const target of targets) {
    if (target.status === 'published') continue
    if (!target.accountId) {
      failed = true
      await updateTarget(target.id, { status: 'failed', error: 'Geen gekoppeld account' })
      continue
    }
    try {
      const { account } = await readyAccount(target.accountId)
      const input: PublishInput = {
        body: target.body,
        title: target.title,
        image: media?.kind === 'image' && bytes ? { bytes, mime: media.mime } : null,
        video: media?.kind === 'video' && bytes ? { bytes, mime: media.mime } : null,
      }
      assertMedia(account.platform, input)
      const result = await publishTo(account, input, media?.id || null)
      await updateTarget(target.id, {
        status: 'published',
        externalId: result.externalId,
        externalUrl: result.url || null,
        error: null,
        publishedAt: new Date(),
      })
    }
    catch (error) {
      failed = true
      await updateTarget(target.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Publiceren mislukte',
      })
    }
  }
  await updatePost(post.id, { status: failed ? 'failed' : 'published' })
}

function assertMedia(platform: SocialPlatform, input: PublishInput) {
  const rule = platformLimits[platform]
  if (rule.requires === 'image' && !input.image) throw new Error(`${platform} heeft een afbeelding nodig`)
  if (rule.requires === 'video' && !input.video) throw new Error(`${platform} heeft een video nodig`)
}

async function publishTo(account: Awaited<ReturnType<typeof readyAccount>>['account'], input: PublishInput, mediaId: string | null) {
  if (account.platform === 'linkedin') return linkedinPublish(account.accessToken, account.externalId, input)
  if (account.platform === 'facebook' || account.platform === 'instagram') return metaPublish(account, input, mediaId)
  if (account.platform === 'youtube') return youtubePublish(account.accessToken, input)
  if (account.platform === 'tiktok') return tiktokPublish(account.accessToken, input)
  throw new Error('Onbekend platform')
}
