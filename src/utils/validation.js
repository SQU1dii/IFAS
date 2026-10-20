/**
 * Lightweight, framework-agnostic validation helpers.
 *
 * The frontend validates for fast feedback only — the backend is always
 * the final authority. Each rule returns `true` when valid or an error
 * string when invalid, so they can be composed into a field-level schema.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value) {
  return EMAIL_RE.test(String(value || '').trim())
}

export function required(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export function minLength(value, n) {
  return (value || '').length >= n
}

export function maxLength(value, n) {
  return (value || '').length <= n
}

export function isNumber(value) {
  if (value === '' || value === null || value === undefined) return false
  return !Number.isNaN(Number(value))
}

export function isPositiveNumber(value) {
  return isNumber(value) && Number(value) > 0
}

export function matches(value, other) {
  return value === other
}

/**
 * Validate that a date string (YYYY-MM-DD) is a real, parseable date.
 */
export function isValidDate(value) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

/**
 * Run a list of rules against a value. Returns the first error message
 * or `null` if all pass.
 *
 * @example
 * const err = runRules(email, [
 *   [required, 'Email is required'],
 *   [isEmail, 'Enter a valid email address'],
 * ])
 */
export function runRules(value, rules) {
  for (const [rule, message, ...args] of rules) {
    const ok = rule(value, ...args)
    if (!ok) return message
  }
  return null
}
