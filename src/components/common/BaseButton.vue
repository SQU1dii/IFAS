<script setup>
/**
 * BaseButton — the single button primitive used throughout the app.
 *
 * Variants: primary (green fill), secondary (white/border), ghost (text only),
 *           danger (rose), link (inline text link style).
 * Sizes: sm, md (default), lg.
 * Supports a loading state that swaps in a spinner and disables the button,
 * and an icon-only mode for compact controls.
 */
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'danger', 'link'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  iconOnly: { type: Boolean, default: false },
  // Pass to make the button render as a router-link or anchor.
  as: { type: [String, Object], default: 'button' },
})
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled || loading"
    :aria-busy="loading"
    :class="[
      // Base
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',

      // Sizes
      size === 'sm' && (iconOnly ? 'h-8 w-8' : 'h-8 px-3.5 text-sm'),
      size === 'md' && (iconOnly ? 'h-9 w-9' : 'h-9 px-4 text-sm'),
      size === 'lg' && (iconOnly ? 'h-11 w-11' : 'h-11 px-6 text-base'),

      // Variants
      variant === 'primary' &&
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
      variant === 'secondary' &&
        'bg-white text-navy-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100',
      variant === 'ghost' &&
        'bg-transparent text-navy-600 hover:bg-slate-100 active:bg-slate-200',
      variant === 'danger' &&
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
      variant === 'link' &&
        'bg-transparent text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline p-0 h-auto',
    ]"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin"
      :class="size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>

    <slot />
  </component>
</template>
