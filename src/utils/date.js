/**
 * Date-range helpers used by the top-bar date filter and analytics pages.
 * Ranges are stored as plain { start, end } ISO date strings so they can
 * be sent to the API or compared against the mock data.
 */

export const RANGE_PRESETS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_year', label: 'This Year' },
  { key: 'all_time', label: 'All Time' },
]

function iso(d) {
  return d.toISOString().slice(0, 10)
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/**
 * Resolve a preset key into { start, end } Date objects.
 */
export function resolvePreset(key) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (key) {
    case 'this_month':
      return { start: new Date(year, month, 1), end: endOfDay(now) }
    case 'last_month':
      return { start: new Date(year, month - 1, 1), end: endOfDay(new Date(year, month, 0)) }
    case 'last_3_months':
      return { start: new Date(year, month - 2, 1), end: endOfDay(now) }
    case 'this_quarter': {
      const q = Math.floor(month / 3)
      return { start: new Date(year, q * 3, 1), end: endOfDay(now) }
    }
    case 'this_year':
      return { start: new Date(year, 0, 1), end: endOfDay(now) }
    case 'all_time':
      return { start: new Date(2000, 0, 1), end: endOfDay(now) }
    default:
      return { start: new Date(year, month, 1), end: endOfDay(now) }
  }
}

/**
 * Given a resolved range, return the equivalent previous period of the
 * same length (used for period-over-period comparisons on the dashboard).
 */
export function previousRange({ start, end }) {
  const length = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - length)
  return { start: startOfDay(prevStart), end: prevEnd }
}

/**
 * Convert a range to ISO date strings suitable for API params.
 */
export function rangeToIso({ start, end }) {
  return { start: iso(start), end: iso(end) }
}
