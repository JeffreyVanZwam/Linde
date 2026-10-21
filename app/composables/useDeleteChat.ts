export function useDeleteChat() {
  const { t } = useI18n()

  function confirmDelete() {
    return confirm(t('chat.confirmDelete'))
  }

  async function deleteChat(id: string) {
    await $fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    const version = useState('chat-history-version', () => 0)
    version.value += 1
  }

  return { confirmDelete, deleteChat }
}
