export function useChatHistory() {
  const version = useState('chat-history-version', () => 0)
  const promoted = useState<{ id: string, at: string } | null>('chat-history-promoted', () => null)

  function promote(id: string) {
    promoted.value = { id, at: new Date().toISOString() }
  }

  function clearPromotion(id: string) {
    if (promoted.value?.id === id) promoted.value = null
  }

  function touch() {
    version.value += 1
  }

  return { version, promoted, promote, clearPromotion, touch }
}
