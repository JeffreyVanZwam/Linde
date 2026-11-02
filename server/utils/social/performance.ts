export type PerformanceLabel = 'strong' | 'average' | 'weak' | 'unknown'

export type PerformanceInput = {
  id: string
  accountId: string | null
  status: string
  impressions: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  clicks: number | null
}

export function interactionCount(target: Pick<PerformanceInput, 'likes' | 'comments' | 'shares' | 'saves' | 'clicks'>) {
  return (target.likes ?? 0) + (target.comments ?? 0) + (target.shares ?? 0) + (target.saves ?? 0) + (target.clicks ?? 0)
}

export function engagementRate(target: PerformanceInput) {
  const base = target.impressions ?? target.reach
  if (base == null || base <= 0 || !hasSignal(target)) return null
  return interactionCount(target) / base
}

export function labelById(targets: PerformanceInput[]) {
  const labels = new Map<string, PerformanceLabel>()
  for (const target of targets) labels.set(target.id, 'unknown')
  const groups = new Map<string, PerformanceInput[]>()
  for (const target of targets) {
    if (!target.accountId || target.status !== 'published') continue
    const group = groups.get(target.accountId) || []
    group.push(target)
    groups.set(target.accountId, group)
  }
  for (const group of groups.values()) {
    const rated = group.flatMap((target) => {
      const score = engagementRate(target)
      return score == null ? [] : [{ target, score }]
    })
    const source = rated.length >= 3
      ? rated
      : group.flatMap((target) => hasSignal(target) ? [{ target, score: interactionCount(target) }] : [])
    if (source.length < 3) continue
    const ranked = [...source].sort((left, right) => right.score - left.score)
    let previous: { score: number, label: PerformanceLabel } | null = null
    for (const [index, item] of ranked.entries()) {
      const share = index / ranked.length
      let label: PerformanceLabel = share < 1 / 3 ? 'strong' : share < 2 / 3 ? 'average' : 'weak'
      if (previous && item.score === previous.score) label = previous.label
      previous = { score: item.score, label }
      labels.set(item.target.id, label)
    }
  }
  return labels
}

function hasSignal(target: PerformanceInput) {
  return [target.impressions, target.reach, target.likes, target.comments, target.shares, target.saves, target.clicks].some(value => value != null)
}
