<script setup>
/**
 * AssistantView — F8: AI Financial Assistant
 *
 * Features:
 *  • Chat UI with user/assistant message bubbles (keyboard accessible)
 *  • Suggestion chips to seed the conversation
 *  • Loading state while waiting for a response
 *  • Error state with retry
 *  • Visible, persistent disclaimer: answers are guidance only
 *  • Conversation history for the session (cleared on workspace switch)
 *  • No financial data is hardcoded — chips are generic suggestions
 *
 * Accessibility:
 *  • aria-live="polite" on the message list so screen readers announce replies
 *  • aria-label on the input and send button
 *  • Scroll-to-bottom after each new message
 */
import { ref, nextTick, watch, onMounted } from 'vue'
import { useAssistantStore } from '@/stores/assistant'
import { useWorkspaceStore } from '@/stores/workspace'
import { formatRelativeTime } from '@/utils/format'

import PageHeader  from '@/components/common/PageHeader.vue'
import BaseButton  from '@/components/common/BaseButton.vue'
import BaseAlert   from '@/components/common/BaseAlert.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const assistant = useAssistantStore()
const ws        = useWorkspaceStore()

// Clear history when the workspace changes.
watch(() => ws.wsId, () => assistant.clear())

// ── Input ────────────────────────────────────────────────
const inputText   = ref('')
const inputRef    = ref(null)
const messagesRef = ref(null)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || assistant.loading) return
  inputText.value = ''
  await assistant.send(text)
  await nextTick()
  scrollToBottom()
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function sendChip(text) {
  inputText.value = text
  nextTick(() => handleSend())
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

onMounted(() => {
  inputRef.value?.focus()
})

// ── Suggestion chips ─────────────────────────────────────
// Generic enough to work across all workspace types.
const CHIPS = [
  'How much did I spend this month?',
  'Which budget am I closest to exceeding?',
  'What are my top 3 expense categories?',
  'Am I on track with my savings goal?',
  'How does this month compare to last month?',
  'What is my current savings rate?',
]
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">

    <PageHeader
      title="AI Financial Assistant"
      subtitle="Ask questions about your finances in plain language"
    />

    <!-- ── Disclaimer (always visible) ───────────────────── -->
    <div
      class="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800 shrink-0"
      role="note"
      aria-label="Disclaimer"
    >
      <svg class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
      <p>
        <strong>Guidance only.</strong> Answers are generated from your transaction records and should not be used as professional financial, tax, or investment advice. Always verify important financial decisions with a qualified professional.
      </p>
    </div>

    <!-- ── Message area ───────────────────────────────────── -->
    <div
      ref="messagesRef"
      class="flex-1 overflow-y-auto scrollbar-thin space-y-4 pb-4 pr-1"
      aria-live="polite"
      aria-label="Conversation"
      aria-atomic="false"
    >
      <!-- Empty / welcome state -->
      <div v-if="!assistant.hasMessages" class="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <div class="h-16 w-16 rounded-2xl bg-navy-800 flex items-center justify-center">
          <svg class="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-navy-800">How can I help?</p>
          <p class="text-xs text-slate-500 mt-1 max-w-xs">
            Ask me about your spending, budgets, or savings goals. I'll look at your data and give you a plain-language answer.
          </p>
        </div>

        <!-- Suggestion chips -->
        <div class="flex flex-wrap justify-center gap-2 max-w-lg mt-2" role="list" aria-label="Suggested questions">
          <button
            v-for="chip in CHIPS"
            :key="chip"
            type="button"
            role="listitem"
            class="text-xs px-3 py-1.5 rounded-full border border-slate-300 bg-white text-navy-600
                   hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            @click="sendChip(chip)"
          >
            {{ chip }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <div
          v-for="msg in assistant.messages"
          :key="msg.id"
          :class="[
            'flex gap-3 max-w-2xl',
            msg.role === 'user' ? 'ml-auto flex-row-reverse' : '',
          ]"
        >
          <!-- Avatar -->
          <span
            :class="[
              'shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
              msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-navy-800 text-emerald-400',
            ]"
            aria-hidden="true"
          >
            {{ msg.role === 'user' ? 'You' : 'AI' }}
          </span>

          <!-- Bubble -->
          <div
            :class="[
              'rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%]',
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-200 text-navy-800 rounded-tl-none shadow-card',
            ]"
          >
            <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
            <p
              :class="[
                'text-[10px] mt-1.5',
                msg.role === 'user' ? 'text-emerald-200' : 'text-slate-400',
              ]"
            >
              {{ formatRelativeTime(msg.created_at) }}
            </p>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="assistant.loading" class="flex gap-3 max-w-2xl">
          <span class="shrink-0 h-8 w-8 rounded-full bg-navy-800 flex items-center justify-center text-xs font-bold text-emerald-400 mt-0.5" aria-hidden="true">AI</span>
          <div class="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-card flex items-center gap-1.5" aria-label="Assistant is typing">
            <span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 0ms" />
            <span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 150ms" />
            <span class="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 300ms" />
          </div>
        </div>
      </template>
    </div>

    <!-- ── Error ──────────────────────────────────────────── -->
    <BaseAlert
      v-if="assistant.error"
      variant="error"
      class="mb-3 shrink-0"
      dismissible
      @dismiss="assistant.error = ''"
    >
      {{ assistant.error }}
    </BaseAlert>

    <!-- ── Input bar ──────────────────────────────────────── -->
    <div class="shrink-0 bg-white border border-slate-200 rounded-2xl shadow-card p-3 flex items-end gap-3">
      <textarea
        ref="inputRef"
        v-model="inputText"
        rows="1"
        class="flex-1 resize-none bg-transparent text-sm text-navy-800 placeholder:text-slate-400
               focus:outline-none leading-relaxed max-h-32 overflow-y-auto scrollbar-thin"
        placeholder="Ask about your spending, budgets, or savings…"
        aria-label="Message to AI assistant"
        :disabled="assistant.loading"
        @keydown="handleKeydown"
        @input="$event.target.style.height = 'auto'; $event.target.style.height = $event.target.scrollHeight + 'px'"
      />

      <!-- Suggestion chips toggle (only shown when chat is active) -->
      <div v-if="assistant.hasMessages && !inputText" class="hidden sm:flex flex-wrap gap-1.5 flex-1 max-w-xs">
        <button
          v-for="chip in CHIPS.slice(0, 3)"
          :key="chip"
          type="button"
          class="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500
                 hover:border-emerald-400 hover:text-emerald-700 transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          @click="sendChip(chip)"
        >
          {{ chip }}
        </button>
      </div>

      <BaseButton
        variant="primary"
        size="md"
        icon-only
        :disabled="!inputText.trim() || assistant.loading"
        aria-label="Send message"
        @click="handleSend"
      >
        <svg v-if="!assistant.loading" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <BaseSpinner v-else size="sm" />
      </BaseButton>
    </div>

  </div>
</template>
