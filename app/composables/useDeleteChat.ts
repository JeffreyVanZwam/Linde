export function useDeleteChat() {
  const { t } = useI18n()

  function confirmDelete() {
    return confirm(t('chat.confirmDelete'))
  }

  async function deleteChat(id: string) {
    await $fetch(`/api/conversations/${id}`, { method: 'DELETE' })
  }

  return { confirmDelete, deleteChat }
}
