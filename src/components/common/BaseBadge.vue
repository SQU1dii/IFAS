<script setup>
/**
 * BaseBadge — small inline pill used for transaction types, status labels,
 * category chips, and budget status indicators.
 */
defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (v) =>
      ['neutral', 'green', 'red', 'amber', 'blue', 'purple', 'navy'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
})

const variantMap = {
  neutral: 'bg-slate-100 text-slate-700',
  green:   'bg-emerald-100 text-emerald-700',
  red:     'bg-rose-100 text-rose-700',
  amber:   'bg-amber-100 text-amber-800',
  blue:    'bg-blue-100 text-blue-700',
  purple:  'bg-purple-100 text-purple-700',
  navy:    'bg-navy-100 text-navy-700',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
      variantMap[variant],
    ]"
  >
    <slot />
  </span>
</template>
