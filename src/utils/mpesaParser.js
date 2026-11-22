/**
 * mpesaParser.js — M-Pesa PDF statement parser with 4-Tier Hybrid Classification
 *
 * Uses pdfjs-dist to extract raw text from an M-Pesa statement PDF,
 * then parses the rows into a normalised transaction shape with confidence scoring.
 *
 * M-Pesa statement columns (official Safaricom format):
 *   Receipt No. | Completion Time | Details | Transaction Status | Paid In | Withdrawn | Balance
 *
 * Classification Pipeline (4 Tiers):
 *   Tier 1: Kenyan Merchant/Paybill/Till Dictionary (Deterministic)
 *   Tier 2: User-Specific Memory (merchant_rules from localStorage)
 *   Tier 3: Keyword-based heuristic with confidence scoring
 *   Tier 4: "Needs Review" queue for low-confidence (< 80%) transactions
 */

import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ═══════════════════════════════════════════════════════════════════
// TIER 1: Kenyan Merchant, Paybill & Till Dictionary (Deterministic)
// ═══════════════════════════════════════════════════════════════════
// Comprehensive lookup table of known Kenyan merchants, paybills, and tills.
// Each entry: { pattern, category_id, category_name, confidence, type }
// pattern can be a string (substring match) or RegExp
const MERCHANT_DICTIONARY = [
  // Utilities — Paybills
  { pattern: /paybill\s*888880|kplc|kenya power/i,                category_id: 'cat-utilities',     category_name: 'Utilities (KPLC / Water)', confidence: 0.98, type: 'expense' },
  { pattern: /paybill\s*444400|nairobi water/i,                   category_id: 'cat-utilities',     category_name: 'Utilities (KPLC / Water)', confidence: 0.98, type: 'expense' },
  { pattern: /paybill\s*222222|zuku|wananchi/i,                   category_id: 'cat-utilities',     category_name: 'Utilities (KPLC / Water)', confidence: 0.95, type: 'expense' },
  { pattern: /paybill\s*555555|safaricom home|safaricom fibre/i,  category_id: 'cat-airtime',       category_name: 'Airtime & Data', confidence: 0.95, type: 'expense' },

  // Government / Statutory
  { pattern: /paybill\s*222222|kra|ecitizen|nssf|nhif|sha/i,     category_id: 'cat-healthcare',    category_name: 'Healthcare / NHIF', confidence: 0.95, type: 'expense' },
  { pattern: /paybill\s*800000|kra|tax/i,                         category_id: 'cat-other-income',  category_name: 'Other Income', confidence: 0.90, type: 'income' },

  // Groceries & Supermarkets — Tills
  { pattern: /till\s*\d{6,}|naivas|carrefour|chandarana|quickmart|grocery|supermarket|tuskys|ukwala|cleanshelf/i,
                                                                    category_id: 'cat-groceries',     category_name: 'Groceries & Food', confidence: 0.92, type: 'expense' },

  // Transport
  { pattern: /uber|bolt|little|cabs|taxi/i,                       category_id: 'cat-transport',     category_name: 'Transport / Matatu', confidence: 0.95, type: 'expense' },
  { pattern: /matatu|sacco|bus|shuttle|kbs|modern coast|easy coach/i,
                                                                    category_id: 'cat-transport',     category_name: 'Transport / Matatu', confidence: 0.90, type: 'expense' },
  { pattern: /total\s*energies|totalenergies|rubis|shell|oil libya|national oil|gulf|hashi|petrol|fuel/i,
                                                                    category_id: 'cat-transport',     category_name: 'Transport / Matatu', confidence: 0.92, type: 'expense' },

  // Dining & Food
  { pattern: /java|artcaffe|kfc|pizza|chicken inn|galitos|dominos|steers|burger|food court|restaurant|cafe/i,
                                                                    category_id: 'cat-dining',        category_name: 'Dining & Eating Out', confidence: 0.90, type: 'expense' },

  // Healthcare
  { pattern: /hospital|clinic|pharmacy|goodlife|health|medical|avenue|avenue hospital|mp shah|agakhan|nairobi hospital/i,
                                                                    category_id: 'cat-healthcare',    category_name: 'Healthcare / NHIF', confidence: 0.92, type: 'expense' },

  // Education
  { pattern: /school|fees|university|college|tuition|kena|kuccps|helb/i,
                                                                    category_id: 'cat-school',        category_name: 'School Fees', confidence: 0.90, type: 'expense' },

  // Shopping
  { pattern: /jumia|kilimall|jiji|shopping|clothes|fashion|mr price|woolworths|truworths|edgars|zara|hm/i,
                                                                    category_id: 'cat-shopping',      category_name: 'Shopping & Clothing', confidence: 0.88, type: 'expense' },

  // Airtime & Data
  { pattern: /airtime|data bundle|safaricom data|bundles/i,       category_id: 'cat-airtime',       category_name: 'Airtime & Data', confidence: 0.95, type: 'expense' },

  // M-Pesa Send Money (P2P transfers)
  { pattern: /send money|sent to|customer transfer to|transfer to\s+\d{10,}/i,
                                                                    category_id: 'cat-mpesa-send',    category_name: 'M-Pesa Send Money', confidence: 0.85, type: 'transfer' },

  // Pay Bill (generic)
  { pattern: /pay bill|paybill|pay bill to/i,                     category_id: 'cat-utilities',     category_name: 'Utilities (KPLC / Water)', confidence: 0.80, type: 'expense' },

  // Bank & Mobile Money Charges
  { pattern: /charge|fee|commission|m-pesa charge|send money charge|pay bill charge|withdrawal charge/i,
                                                                    category_id: 'cat-airtime',       category_name: 'Airtime & Data', confidence: 0.90, type: 'expense' },

  // Savings / Investment (Transfers)
  { pattern: /m-shwari|kcb m-pesa|lock savings|target savings|mali|mali|investment|money market|unit trust/i,
                                                                    category_id: null,                category_name: null, confidence: 0.95, type: 'transfer' },

  // Salary / Income
  { pattern: /salary|payroll|wages|pension|dividend|interest|investment income/i,
                                                                    category_id: 'cat-salary',        category_name: 'Salary', confidence: 0.95, type: 'income' },

  // Chama
  { pattern: /chama|chama contribution|group contribution/i,      category_id: 'cat-chama',         category_name: 'Chama Contributions', confidence: 0.90, type: 'expense' },

  // Subscriptions
  { pattern: /netflix|dstv|showmax|spotify|youtube|subscription|prime video|apple music/i,
                                                                    category_id: 'cat-subscriptions', category_name: 'Subscriptions', confidence: 0.92, type: 'expense' },
]

// ═══════════════════════════════════════════════════════════════════
// TIER 2: User-Specific Merchant Rules (from localStorage)
// ═══════════════════════════════════════════════════════════════════
const USER_RULES_KEY = 'ifas_merchant_rules'

function loadUserRules() {
  try {
    const stored = localStorage.getItem(USER_RULES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveUserRules(rules) {
  try {
    localStorage.setItem(USER_RULES_KEY, JSON.stringify(rules))
  } catch (e) {
    console.warn('Failed to save merchant rules:', e)
  }
}

export function addUserMerchantRule(normalizedRecipient, categoryId, categoryName) {
  const rules = loadUserRules()
  rules[normalizedRecipient] = { category_id: categoryId, category_name: categoryName, updatedAt: new Date().toISOString() }
  saveUserRules(rules)
}

export function getUserMerchantRules() {
  return loadUserRules()
}

export function normalizeRecipient(description) {
  // Extract the recipient name from M-Pesa description patterns
  // "Customer Transfer to 2547XX... - JOHN DOE" -> "JOHN DOE"
  // "Merchant Payment Online to 522522 - NAIVAS SUPERMARKET" -> "NAIVAS SUPERMARKET"
  // "Pay Bill to 888880 - KPLC PREPAID" -> "KPLC PREPAID"
  const patterns = [
    /customer transfer to\s+[\d\s-]+\s*[-–]\s*(.+)/i,
    /merchant payment online to\s+[\d\s-]+\s*[-–]\s*(.+)/i,
    /pay bill to\s+[\d\s-]+\s*[-–]\s*(.+)/i,
    /send money to\s+[\d\s-]+\s*[-–]\s*(.+)/i,
    /funds received from\s+[\d\s-]+\s*[-–]\s*(.+)/i,
    /m-shwari|kcb m-pesa|lock savings|target savings/i,
  ]

  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match && match[1]) {
      return match[1].trim().toUpperCase().slice(0, 80)
    }
  }

  // Fallback: use first 50 chars of description, cleaned
  return description.trim().toUpperCase().slice(0, 50)
}

// ═══════════════════════════════════════════════════════════════════
// TIER 3: Keyword-based Heuristic with Confidence Scoring
// ═══════════════════════════════════════════════════════════════════

const TRANSFER_KEYWORDS = [
  'send money', 'transfer', 'sent to', 'withdraw cash',
  'atm withdrawal', 'agent withdrawal', 'm-shwari', 'kcb m-pesa',
  'lock savings', 'target savings', 'deposit to', 'withdraw from'
]

const INCOME_KEYWORDS = [
  'salary', 'payroll', 'wages', 'pension', 'dividend',
  'interest', 'investment', 'funds received', 'received from'
]

function classifyType(description, paidIn, withdrawn) {
  const desc = (description || '').toLowerCase()

  // Paid In = Income (high confidence)
  if (paidIn > 0) return { type: 'income', confidence: 0.95 }

  // Withdrawn = Expense or Transfer
  if (withdrawn > 0) {
    // Check for transfer keywords
    if (TRANSFER_KEYWORDS.some((k) => desc.includes(k))) {
      return { type: 'transfer', confidence: 0.88 }
    }
    // Check for income keywords in withdrawn (rare but possible - refunds)
    if (INCOME_KEYWORDS.some((k) => desc.includes(k))) {
      return { type: 'income', confidence: 0.75 }
    }
    return { type: 'expense', confidence: 0.85 }
  }

  return { type: 'expense', confidence: 0.5 }
}

// Enhanced category guesser with confidence
function guessCategoryWithConfidence(description, type) {
  if (type === 'transfer') return { category_id: null, category_name: null, confidence: 0.9, source: 'transfer_rule' }

  const desc = (description || '').toLowerCase()

  // TIER 1: Merchant Dictionary (highest confidence)
  for (const entry of MERCHANT_DICTIONARY) {
    const matched = entry.pattern instanceof RegExp
      ? entry.pattern.test(desc)
      : desc.includes(entry.pattern.toLowerCase())

    if (matched) {
      // Only return if type matches (e.g., don't categorize income as expense)
      if (entry.type && entry.type !== type) continue

      return {
        category_id: entry.category_id,
        category_name: entry.category_name,
        confidence: entry.confidence,
        source: 'merchant_dict'
      }
    }
  }

  // TIER 2: User-Specific Rules
  const normalizedRecipient = normalizeRecipient(description)
  const userRules = loadUserRules()
  if (userRules[normalizedRecipient]) {
    return {
      category_id: userRules[normalizedRecipient].category_id,
      category_name: userRules[normalizedRecipient].category_name,
      confidence: 0.95,
      source: 'user_rule'
    }
  }

  // TIER 3: Keyword Heuristics (lower confidence)
  const keywordRules = [
    { keywords: ['airtime', 'data bundle', 'safaricom data'], category_id: 'cat-airtime', category_name: 'Airtime & Data', confidence: 0.80 },
    { keywords: ['naivas', 'carrefour', 'chandarana', 'quickmart', 'grocery', 'supermarket'], category_id: 'cat-groceries', category_name: 'Groceries & Food', confidence: 0.82 },
    { keywords: ['uber', 'bolt', 'matatu', 'transit', 'fuel', 'petrol', 'total energies', 'shell'], category_id: 'cat-transport', category_name: 'Transport / Matatu', confidence: 0.80 },
    { keywords: ['java', 'artcaffe', 'kfc', 'pizza', 'chicken inn', 'food court'], category_id: 'cat-dining', category_name: 'Dining & Eating Out', confidence: 0.78 },
    { keywords: ['jumia', 'shopping', 'clothes', 'fashion', 'mr price', 'woolworths'], category_id: 'cat-shopping', category_name: 'Shopping & Clothing', confidence: 0.75 },
    { keywords: ['hospital', 'clinic', 'pharmacy', 'nhif', 'health', 'medical'], category_id: 'cat-healthcare', category_name: 'Healthcare / NHIF', confidence: 0.80 },
    { keywords: ['school', 'fees', 'university', 'college', 'tuition'], category_id: 'cat-school', category_name: 'School Fees', confidence: 0.82 },
    { keywords: ['netflix', 'dstv', 'showmax', 'spotify', 'subscription'], category_id: 'cat-subscriptions', category_name: 'Subscriptions', confidence: 0.85 },
    { keywords: ['salary', 'payroll', 'wages'], category_id: 'cat-salary', category_name: 'Salary', confidence: 0.90 },
    { keywords: ['dividend', 'interest', 'investment'], category_id: 'cat-investment', category_name: 'Investment Income', confidence: 0.85 },
    { keywords: ['chama'], category_id: 'cat-chama', category_name: 'Chama Contributions', confidence: 0.80 },
  ]

  for (const rule of keywordRules) {
    if (rule.keywords.some((k) => desc.includes(k))) {
      return {
        category_id: rule.category_id,
        category_name: rule.category_name,
        confidence: rule.confidence,
        source: 'keyword_heuristic'
      }
    }
  }

  // No match — needs review
  return { category_id: null, category_name: null, confidence: 0.0, source: 'none' }
}

// ── Amount parser ─────────────────────────────────────────
function parseAmount(raw) {
  if (!raw || typeof raw !== 'string') return 0
  const cleaned = raw.replace(/[Kk][Ss][Hh]?/g, '').replace(/,/g, '').replace(/\s/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '') return 0
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

// ── Date parser ───────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null
  const s = raw.trim()
  // Format: "2024-06-18 14:35:00" or "2024-06-18"
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  // Format: "18/06/2024 14:35:00" or "18/06/2024"
  const dmy = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  // Format: "Jun 18, 2024" or "18 Jun 2024"
  try {
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch { /* ignore */ }
  return null
}

// ── PDF text extraction ───────────────────────────────────
/**
 * Load a PDF file with an optional password.
 * Returns all pages' text with two extraction strategies:
 *   1. Items joined with '\t' (preserves columnar layout)
 *   2. Items joined with ' '  (plain readable text)
 * Both are returned so the parser can try both.
 *
 * @param {File} file
 * @param {string} [password]
 * @returns {Promise<{ tabText: string, spaceText: string }>}
 */
export async function extractTextFromPdf(file, password = '') {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    password: password || undefined,
  })

  const pdf = await loadingTask.promise
  const tabPages   = []
  const spacePages = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()

    // Group text items by their Y position to reconstruct visual rows.
    // pdfjs-dist returns items in stream order, not visual order.
    // Without grouping, all items on a page become one long line,
    // and the row parser can't find transaction boundaries.
    const rowMap = {}
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue
      // Round Y to nearest 2px to merge items on the same visual line
      const y = Math.round(item.transform[5] / 2) * 2
      if (!rowMap[y]) rowMap[y] = []
      rowMap[y].push({ x: item.transform[4], text: item.str })
    }

    // Sort rows top-to-bottom (Y descending = top of page first)
    const sortedYs = Object.keys(rowMap).map(Number).sort((a, b) => b - a)
    for (const y of sortedYs) {
      // Sort items left-to-right within each row
      const cells = rowMap[y].sort((a, b) => a.x - b.x).map((c) => c.text)
      tabPages.push(cells.join('\t'))
      spacePages.push(cells.join(' '))
    }
  }

  return {
    tabText:   tabPages.join('\n'),
    spaceText: spacePages.join('\n'),
  }
}

// ── Row parser ────────────────────────────────────────────
/**
 * Parse text extracted from an M-Pesa PDF.
 *
 * Strategy:
 *   1. Try tab-delimited parsing (best for well-structured PDFs).
 *   2. Fall back to space-delimited + regex line matching.
 *   3. If still empty, try a pure-regex scan over the raw text.
 *
 * Returns:
 *   {
 *     transactions: ParsedRow[],
 *     summary: { total, income_count, expense_count, transfer_count,
 *                total_paid_in, total_withdrawn, period_from, period_to,
 *                needs_review_count },
 *     meta: { customer_name, mobile_number, statement_period }
 *   }
 */
export function parseMpesaText(rawInput) {
  // rawInput can be a string (legacy) or the new { tabText, spaceText } object
  const tabText   = typeof rawInput === 'string' ? rawInput : rawInput.tabText
  const spaceText = typeof rawInput === 'string' ? rawInput : rawInput.spaceText

  // Extract metadata from space text (more readable)
  const meta = extractMeta(spaceText ?? tabText)

  // Try strategy 1: tab-delimited column parsing
  let transactions = parseTabDelimited(tabText)

  // Strategy 2: regex scan on the full text as fallback
  if (!transactions.length) {
    transactions = parseRegexScan(spaceText ?? tabText)
  }

  // Sort oldest → newest
  transactions.sort((a, b) => (a.date > b.date ? 1 : -1))

  const income_count    = transactions.filter((t) => t.type === 'income').length
  const expense_count   = transactions.filter((t) => t.type === 'expense').length
  const transfer_count  = transactions.filter((t) => t.type === 'transfer').length
  const needs_review_count = transactions.filter((t) => t.needs_review).length
  const total_paid_in   = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const total_withdrawn = transactions.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0)
  const dates           = transactions.map((t) => t.date).filter(Boolean).sort()

  return {
    transactions,
    summary: {
      total: transactions.length,
      income_count,
      expense_count,
      transfer_count,
      needs_review_count,
      total_paid_in:   Math.round(total_paid_in   * 100) / 100,
      total_withdrawn: Math.round(total_withdrawn * 100) / 100,
      period_from: dates[0]              ?? null,
      period_to:   dates[dates.length-1] ?? null,
    },
    meta,
  }
}

// ── Strategy 1: tab-delimited ─────────────────────────────
function parseTabDelimited(text) {
  const lines      = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const result     = []
  let inData       = false
  let headerCols   = []

  for (const line of lines) {
    const cols   = line.split('\t').map((c) => c.trim())
    const joined = cols.join(' ').toLowerCase()

    if (!inData) {
      // Detect header row — must contain at least receipt + completion/date + details
      if (
        (joined.includes('receipt') || joined.includes('trans')) &&
        (joined.includes('completion') || joined.includes('date') || joined.includes('time')) &&
        (joined.includes('detail') || joined.includes('description'))
      ) {
        inData      = true
        headerCols  = cols
      }
      continue
    }

    // Skip duplicate headers, totals, blank rows
    if (cols.length < 3) continue
    if (joined.includes('receipt') && joined.includes('completion')) continue
    if (joined.includes('total') && joined.includes('number')) continue

    const row = extractRowFromCols(cols, headerCols)
    if (row) result.push(row)
  }

  return result
}

function findColIdx(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toLowerCase()
    if (keywords.some((k) => h.includes(k))) return i
  }
  return null
}

function extractRowFromCols(cols, headerCols) {
  const idx = {
    receipt:   findColIdx(headerCols, ['receipt', 'trans. id', 'transaction id']) ?? 0,
    date:      findColIdx(headerCols, ['completion', 'date', 'time'])             ?? 1,
    details:   findColIdx(headerCols, ['detail', 'description', 'narration'])     ?? 2,
    status:    findColIdx(headerCols, ['status'])                                 ?? 3,
    paid_in:   findColIdx(headerCols, ['paid in', 'credit', 'deposit'])           ?? 4,
    withdrawn: findColIdx(headerCols, ['withdrawn', 'debit', 'paid out'])         ?? 5,
    balance:   findColIdx(headerCols, ['balance'])                                ?? 6,
  }

  const receipt    = cols[idx.receipt]    ?? ''
  const dateRaw    = cols[idx.date]       ?? ''
  const details    = cols[idx.details]    ?? ''
  const status     = cols[idx.status]     ?? ''
  const paidInRaw  = cols[idx.paid_in]    ?? ''
  const withdrRaw  = cols[idx.withdrawn]  ?? ''
  const balanceRaw = cols[idx.balance]    ?? ''

  // Skip non-completed (but only if status field is present and non-empty)
  if (status && status.trim() && !status.toLowerCase().includes('complet')) return null

  // Skip rows without a plausible receipt number (at least 5 alphanumeric chars)
  if (!receipt || receipt.length < 5 || !/[A-Z0-9]{5,}/i.test(receipt)) return null

  const paidIn    = parseAmount(paidInRaw)
  const withdrawn = parseAmount(withdrRaw)
  const balance   = parseAmount(balanceRaw)

  if (paidIn === 0 && withdrawn === 0) return null

  const date = parseDate(dateRaw)
  if (!date) return null

  return buildRow(receipt, date, details, paidIn, withdrawn, balance)
}

// ── Strategy 2: regex scan ────────────────────────────────
// Looks for M-Pesa receipt number patterns (e.g. "RJK4X8XR0C")
// followed by a date and amount, regardless of column layout.
function parseRegexScan(text) {
  const result = []
  // M-Pesa receipt numbers: 10 alphanumeric characters, all-caps
  // e.g. "RJK4X8XR0C" or "QGM0A5SE3A"
  const RECEIPT_RE = /\b([A-Z0-9]{10})\b/g
  const lines      = text.split(/\n/)

  // Build a flat token stream — each line's tokens
  const lineTokens = lines.map((l) => l.split(/\s+/).filter(Boolean))

  for (let li = 0; li < lineTokens.length; li++) {
    const lineStr = lines[li]
    const match   = lineStr.match(/\b([A-Z0-9]{10})\b/)
    if (!match) continue

    const receipt = match[1]

    // Look for a date in this line and the next 3 lines
    let date     = null
    let details  = ''
    let paidIn   = 0
    let withdrawn = 0
    let balance  = 0
    const window = lines.slice(li, li + 5).join(' ')

    // Date extraction
    const dateMatch = window.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/)
    if (dateMatch) date = parseDate(dateMatch[1])
    if (!date) continue

    // Amount extraction — find all numbers that look like KSh amounts
    const amounts = [...window.matchAll(/[\d,]+\.\d{2}/g)].map((m) => parseAmount(m[0])).filter((n) => n > 0)

    // The description is whatever text is not receipt/date/amount
    const stripped = window
      .replace(receipt, '')
      .replace(/\d{4}-\d{2}-\d{2}[\s\d:]+/, '')
      .replace(/\d{2}\/\d{2}\/\d{4}[\s\d:]+/, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/Completed|Pending|Failed/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    details = stripped.slice(0, 120)

    // Assign first two amounts as paid_in / withdrawn heuristically
    // based on whether "paid in" or "credit" label appears nearby
    const wl = window.toLowerCase()
    if (amounts.length >= 2) {
      if (wl.includes('paid in') || wl.includes('credit') || wl.includes('received')) {
        paidIn    = amounts[0]
        withdrawn = 0
        balance   = amounts[amounts.length - 1]
      } else {
        paidIn    = 0
        withdrawn = amounts[0]
        balance   = amounts[amounts.length - 1]
      }
    } else if (amounts.length === 1) {
      // Single amount — classify by description
      const typeResult = classifyType(details, 0, amounts[0])
      if (typeResult.type === 'income') { paidIn = amounts[0] } else { withdrawn = amounts[0] }
    }

    if (paidIn === 0 && withdrawn === 0) continue

    const row = buildRow(receipt, date, details, paidIn, withdrawn, balance)
    if (row) result.push(row)

    // Skip ahead to avoid re-processing the same window
    li += 2
  }

  // Deduplicate by receipt number
  const seen = new Set()
  return result.filter((r) => {
    if (seen.has(r.receipt_no)) return false
    seen.add(r.receipt_no)
    return true
  })
}

// ── Shared row builder with confidence scoring ────────────────────────────────────
function buildRow(receipt, date, details, paidIn, withdrawn, balance) {
  const amount  = paidIn > 0 ? paidIn : withdrawn
  const typeResult = classifyType(details, paidIn, withdrawn)
  const cat     = guessCategoryWithConfidence(details, typeResult.type)

  let dest_name = null
  if (typeResult.type === 'transfer') {
    const m = details.match(/to\s+[\d]+\s*[-–]\s*(.+)/i)
              || details.match(/to\s+([A-Za-z\s]{3,40})\s*$/i)
    if (m) dest_name = m[1].trim().slice(0, 60)
  }

  // Determine if needs review (confidence < 80% and not a transfer with auto-detected dest)
  const needs_review = cat.confidence < 0.80 && typeResult.type !== 'transfer'

  return {
    receipt_no:               receipt,
    date,
    description:              details || `Transaction ${receipt}`,
    type:                     typeResult.type,
    type_confidence:          typeResult.confidence,
    amount,
    account_id:               'acc-mpesa',
    account_name:             'M-Pesa',
    destination_account_id:   null,
    destination_account_name: typeResult.type === 'transfer' ? (dest_name ?? 'External') : null,
    category_id:              cat.category_id,
    category_name:            cat.category_name,
    category_confidence:      cat.confidence,
    category_source:          cat.source,
    needs_review,
    balance,
    notes:                    `Ref: ${receipt}`,
    _raw: { paid_in: paidIn, withdrawn },
  }
}

// ── Metadata extraction ───────────────────────────────────
function extractMeta(text) {
  let customer_name    = ''
  let mobile_number    = ''
  let statement_period = ''

  for (const line of text.split(/\n/).slice(0, 40)) {
    const lc = line.toLowerCase()
    if ((lc.includes('customer name') || lc.includes('full name') || lc.includes('account name'))
        && !customer_name) {
      customer_name = line.replace(/^[^:]+:\s*/i, '').trim().slice(0, 80)
    }
    if ((lc.includes('mobile') || lc.includes('phone')) && /07\d{8}|2547\d{8}/.test(line)
        && !mobile_number) {
      const m = line.match(/(07\d{8}|2547\d{8})/)
      if (m) mobile_number = m[1]
    }
    if (lc.includes('statement period') && !statement_period) {
      statement_period = line.replace(/^[^:]+:\s*/i, '').trim().slice(0, 80)
    }
  }

  return { customer_name, mobile_number, statement_period }
}