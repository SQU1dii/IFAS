<script setup>
/**
 * BaseCard — the standard white rounded card surface.
 * Wraps the `.card-pad` design-system class so padding is consistent.
 * Use the `flat` prop to remove the shadow for nested/inner cards.
 */
defineProps({
  /** Remove the box-shadow (for cards inside cards). */
  flat: { type: Boolean, default: false },
  /** Remove the internal padding (for cards with custom layout sections). */
  noPad: { type: Boolean, default: false },
})
</script>

<template>
  <div
    :class="[
      'bg-white rounded-2xl border border-slate-200',
      !flat && 'shadow-card',
      !noPad && 'p-5 sm:p-6',
    ]"
  >
    <slot />
  </div>
</template>
