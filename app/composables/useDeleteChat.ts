export function useDeleteChat() {
  const { t } = useI18n()
  const { touch, clearPromotion } = useChatHistory()

  function confirmDelete() {
    return confirm(t('chat.confirmDelete'))
  }

  async function deleteChat(id: string) {
    await $fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    clearPromotion(id)
    touch()
  }

  return { confirmDelete, deleteChat }
}
