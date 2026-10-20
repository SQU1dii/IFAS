<script setup>
/**
 * BaseAlert — inline contextual message for form feedback, API errors,
 * warnings, and success confirmations.
 *
 * Variants: error, warning, success, info.
 * Dismissible when the `dismissible` prop is set.
 */
import { ref } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['error', 'warning', 'success', 'info'].includes(v),
  },
  title: { type: String, default: '' },
  dismissible: { type: Boolean, default: false },
})

const emit = defineEmits(['dismiss'])
const visible = ref(true)

function dismiss() {
  visible.value = false
  emit('dismiss')
}

const styles = {
  error:   { wrap: 'bg-rose-50   border-rose-300',   icon: 'text-rose-500',    title: 'text-rose-800',   body: 'text-rose-700'   },
  warning: { wrap: 'bg-amber-50  border-amber-300',  icon: 'text-amber-500',   title: 'text-amber-800',  body: 'text-amber-700'  },
  success: { wrap: 'bg-emerald-50 border-emerald-300', icon: 'text-emerald-500', title: 'text-emerald-800', body: 'text-emerald-700' },
  info:    { wrap: 'bg-blue-50   border-blue-300',   icon: 'text-blue-500',    title: 'text-blue-800',   body: 'text-blue-700'   },
}

const icons = {
  error:   'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  success: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  info:    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
}
</script>

<template>
  <div
    v-if="visible"
    role="alert"
    :class="['flex gap-3 rounded-xl border px-4 py-3.5 text-sm animate-fade-in', styles[variant].wrap]"
  >
    <!-- Icon -->
    <svg class="h-5 w-5 shrink-0 mt-0.5" :class="styles[variant].icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" :d="icons[variant]" />
    </svg>

    <div class="flex-1 min-w-0">
      <p v-if="title" :class="['font-semibold mb-0.5', styles[variant].title]">{{ title }}</p>
      <div :class="styles[variant].body"><slot /></div>
    </div>

    <!-- Dismiss -->
    <button
      v-if="dismissible"
      type="button"
      class="shrink-0 self-start rounded p-0.5 opacity-60 hover:opacity-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      :aria-label="`Dismiss ${variant} message`"
      @click="dismiss"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
