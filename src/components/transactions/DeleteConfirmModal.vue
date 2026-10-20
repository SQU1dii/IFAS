<script setup>
/**
 * DeleteConfirmModal — generic confirmation dialog before destructive actions.
 */
import BaseButton from '@/components/common/BaseButton.vue'

defineProps({
  open:    { type: Boolean, default: false },
  title:   { type: String,  default: 'Delete transaction' },
  message: { type: String,  default: 'This action cannot be undone. Are you sure?' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="emit('close')" />
      <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
        <div class="flex items-start gap-4">
          <span class="shrink-0 h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
            <svg class="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <h2 class="text-base font-semibold text-navy-800">{{ title }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ message }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
          <BaseButton variant="danger" :loading="loading" @click="emit('confirm')">Delete</BaseButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
