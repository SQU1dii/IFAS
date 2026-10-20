<script setup>
/**
 * BaseInput — labelled text/email/password input with optional hint and
 * error message. Exposes the value through v-model.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  autocomplete: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'blur'])

const inputId = computed(() => props.id || `input-${Math.random().toString(36).slice(2, 8)}`)
const hasError = computed(() => !!props.error)
</script>

<template>
  <div class="field">
    <label v-if="label" :for="inputId" class="field-label">
      {{ label }}
      <span v-if="required" class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
    </label>

    <input
      :id="inputId"
      :name="name || inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :aria-invalid="hasError"
      :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
      :class="['input', hasError && 'input-error']"
      @input="emit('update:modelValue', $event.target.value)"
      @blur="emit('blur', $event)"
    />

    <p v-if="hint && !error" :id="`${inputId}-hint`" class="field-hint">{{ hint }}</p>
    <p v-if="error" :id="`${inputId}-error`" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
