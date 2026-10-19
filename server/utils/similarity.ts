function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3),
  )
}

export function jaccard(left: string, right: string) {
  const a = tokens(left)
  const b = tokens(right)
  if (!a.size || !b.size) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }
  return intersection / (a.size + b.size - intersection)
}

export function duplicateWarning(body: string, existing: string[]) {
  let best = 0
  let match = ''
  for (const candidate of existing) {
    const score = jaccard(body, candidate)
    if (score > best) {
      best = score
      match = candidate
    }
  }
  if (best < 0.55) return null
  return `Lijkt sterk op een eerdere post (${Math.round(best * 100)}%): ${match.slice(0, 140)}`
}
