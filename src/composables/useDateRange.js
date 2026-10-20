import { computed, ref, watch } from 'vue'
import {
  RANGE_PRESETS,
  resolvePreset,
  previousRange,
  rangeToIso,
} from '@/utils/date'

/**
 * Shared date-range state used by the top-bar filter and any view that
 * needs the selected period (dashboard, analytics, reports, etc.).
 *
 * Returns reactive refs plus helpers so components can bind to them
 * directly without duplicating range logic.
 */
export function useDateRange() {
  const presetKey = ref('this_month')
  const customStart = ref(null) // ISO strings when using a custom range
  const customEnd = ref(null)
  const isCustom = ref(false)

  const presetLabel = computed(
    () => RANGE_PRESETS.find((p) => p.key === presetKey.value)?.label ?? 'Custom'
  )

  // Resolved { start, end } as Date objects.
  const range = computed(() => {
    if (isCustom.value && customStart.value && customEnd.value) {
      return {
        start: new Date(customStart.value),
        end: new Date(customEnd.value),
      }
    }
    return resolvePreset(presetKey.value)
  })

  // Previous (comparison) period as Date objects.
  const comparisonRange = computed(() => previousRange(range.value))

  // ISO strings ready to send to the API / match against mock data.
  const rangeIso = computed(() => rangeToIso(range.value))
  const comparisonIso = computed(() => rangeToIso(comparisonRange.value))

  function selectPreset(key) {
    presetKey.value = key
    isCustom.value = false
  }

  function setCustom(start, end) {
    customStart.value = start
    customEnd.value = end
    isCustom.value = true
  }

  return {
    presetKey,
    isCustom,
    presetLabel,
    range,
    comparisonRange,
    rangeIso,
    comparisonIso,
    selectPreset,
    setCustom,
    presets: RANGE_PRESETS,
  }
}
