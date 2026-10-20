<script setup>
/**
 * BaseSelect — labelled <select> with error state, v-model support.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: {
    // [{ value, label }] or plain strings
    type: Array,
    default: () => [],
  },
  placeholder: { type: String, default: 'Select an option' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const selectId = computed(() => props.id || `select-${Math.random().toString(36).slice(2, 8)}`)
const hasError = computed(() => !!props.error)
</script>

<template>
  <div class="field">
    <label v-if="label" :for="selectId" class="field-label">
      {{ label }}
      <span v-if="required" class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
    </label>

    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-invalid="hasError"
      :class="['input', hasError && 'input-error', 'cursor-pointer']"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option
        v-for="opt in options"
        :key="typeof opt === 'object' ? opt.value : opt"
        :value="typeof opt === 'object' ? opt.value : opt"
      >
        {{ typeof opt === 'object' ? opt.label : opt }}
      </option>
    </select>

    <p v-if="hint && !error" class="field-hint">{{ hint }}</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
