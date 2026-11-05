import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import workspaceService from '@/services/workspaceService'

/**
 * Assistant store — owns the AI chat session state.
 *
 * One conversation per workspace. Conversation id is created on the
 * first message and reused for the session.
 *
 * Messages: [{ id, role: 'user'|'assistant', content, created_at }]
 */
export const useAssistantStore = defineStore('assistant', () => {
  const messages       = ref([])
  const conversationId = ref(null)
  const loading        = ref(false)
  const error          = ref('')

  const ws = useWorkspaceStore()

  const hasMessages = computed(() => messages.value.length > 0)

  async function send(content) {
    if (!content.trim() || loading.value) return

    // Optimistically add the user message.
    const userMsg = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    messages.value.push(userMsg)
    loading.value = true
    error.value   = ''

    try {
      const res = await workspaceService.sendMessage(
        ws.wsId,
        conversationId.value,
        content.trim()
      )
      conversationId.value = res.conversation_id
      messages.value.push(res.message)
    } catch (e) {
      error.value = e?.message ?? 'Failed to get a response. Please try again.'
      // Remove the optimistic user message on failure so the user can retry.
      messages.value = messages.value.filter((m) => m.id !== userMsg.id)
    } finally {
      loading.value = false
    }
  }

  function clear() {
    messages.value       = []
    conversationId.value = null
    error.value          = ''
  }

  return { messages, conversationId, loading, error, hasMessages, send, clear }
})
