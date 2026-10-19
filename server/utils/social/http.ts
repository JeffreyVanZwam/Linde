export async function formPost(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data === 'object' && data && 'error_description' in data
      ? String(data.error_description)
      : `Tokenverzoek mislukte (${response.status})`)
  }
  return data as Record<string, unknown>
}

export async function jsonRequest(url: string, options: {
  method?: string
  token: string
  body?: unknown
  headers?: Record<string, string>
}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      authorization: `Bearer ${options.token}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) as Record<string, unknown> : {}
  if (!response.ok) {
    const message = typeof data.error === 'object' && data.error && 'message' in data.error
      ? String((data.error as { message: string }).message)
      : typeof data.error === 'string'
        ? data.error
        : text.slice(0, 300)
    throw new Error(message || `Verzoek mislukte (${response.status})`)
  }
  return data
}

export function readString(data: Record<string, unknown>, key: string) {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}
