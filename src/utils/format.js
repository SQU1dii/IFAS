/**
 * Formatting helpers for money, dates, and percentages.
 * All views should route display values through these so the
 * presentation stays consistent across the app.
 */

const DEFAULT_CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'KES'

/**
 * Format a number as currency.
 * @param {number} amount
 * @param {string} [currency] - ISO 4217 code, defaults to env or KES
 * @returns {string}
 *
 * KES formatting: en-KE locale produces "KSh 42,000" (no decimals for
 * whole-shilling amounts, matching standard Kenyan display).
 * Other currencies fall back to en-US formatting.
 */
export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    const locale = currency === 'KES' ? 'en-KE' : 'en-US'
    // For KES drop cents when the value is a whole number; keep 2 dp otherwise.
    const hasCents = (value % 1 !== 0)
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `KSh ${value.toFixed(0)}`
  }
}

/**
 * Format a signed amount, prefixing income with "+" and expenses with "-".
 * Useful for net cash flow and change indicators.
 */
export function formatSignedCurrency(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCurrency(value, currency)}`
}

/**
 * Format a value as a percentage string.
 * @param {number} value - already a percentage (e.g. 42.5 for 42.5%)
 * @param {number} [digits]
 */
export function formatPercent(value, digits = 1) {
  const v = Number(value) || 0
  return `${v.toFixed(digits)}%`
}

/**
 * Compact percentage-change helper. Pass the difference as a fraction
 * (0.12 => "+12.0%"), typically used for period comparisons.
 */
export function formatChange(fraction, digits = 1) {
  const v = (Number(fraction) || 0) * 100
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(digits)}%`
}

const DATE_OPTS = { year: 'numeric', month: 'short', day: 'numeric' }
const DATE_OPTS_SHORT = { month: 'short', day: 'numeric' }
const MONTH_OPTS = { year: 'numeric', month: 'short' }

/**
 * Format an ISO date string or Date as "Oct 5, 2025".
 */
export function formatDate(input) {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', DATE_OPTS)
}

/**
 * Short format "Oct 5" — handy for table rows.
 */
export function formatDateShort(input) {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', DATE_OPTS_SHORT)
}

/**
 * Format as "Oct 2025" — for chart axis labels.
 */
export function formatMonth(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', MONTH_OPTS)
}

/**
 * Convert an ISO date to the value an <input type="date"> expects ("YYYY-MM-DD").
 */
export function toDateInputValue(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/**
 * Human-readable relative time, e.g. "3 days ago".
 */
export function formatRelativeTime(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.round(diffDays / 7)} week(s) ago`
  return formatDate(input)
}
