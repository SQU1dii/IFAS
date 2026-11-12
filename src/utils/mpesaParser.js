/**
 * mpesaParser.js — M-Pesa PDF statement parser
 *
 * Uses pdfjs-dist to extract raw text from an M-Pesa statement PDF,
 * then parses the rows into a normalised transaction shape.
 *
 * M-Pesa statement columns (official Safaricom format):
 *   Receipt No. | Completion Time | Details | Transaction Status | Paid In | Withdrawn | Balance
 *
 * Key quirks:
 *  • PDFs are password-protected (ID/passport number as password).
 *  • Amounts use comma-thousands separators: "1,234.50" — must strip commas.
 *  • "Completion Time" format: "2024-06-18 14:35:00" or "18/06/2024 14:35:00".
 *  • "Transaction Status" is always "Completed" for successful rows; we skip non-Completed.
 *  • Paid In / Withdrawn are mutually exclusive per row (the other is blank / "0.00").
 *  • The M-Pesa account itself maps to the user's M-Pesa account (acc-mpesa).
 *  • Transfers (Send Money) have a destination implied in Details.
 *  • We auto-classify transaction types:
 *      Paid In  > 0  → income
 *      Withdrawn > 0 → expense  (unless description contains "Send Money" / "Transfer" → transfer)
 */

// pdfjs-dist worker — Vite serves the worker from node_modules automatically.
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ── Amount parser ─────────────────────────────────────────
function parseAmount(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return 0
  // Remove currency prefix (e.g. "Ksh"), commas, and spaces
  const cleaned = raw.replace(/[Kk][Ss][Hh]?/g, '').replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

// ── Date parser ───────────────────────────────────────────
function parseDate(raw) {
  if (!raw) return null
  const s = raw.trim()
  // Format 1: "2024-06-18 14:35:00"
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  // Format 2: "18/06/2024 14:35:00"
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  // Format 3: "Jun 18, 2024"
  const mdy = s.match(/^(\w+)\s+(\d+),?\s+(\d{4})/)
  if (mdy) {
    const d = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}

// ── Transaction-type classifier ──────────────────────────
const INCOME_KEYWORDS   = ['received', 'receive', 'reversal', 'refund', 'salary', 'deposit', 'paid in']
const TRANSFER_KEYWORDS = ['send money', 'transfer', 'sent to', 'withdraw cash', 'atm']
const EXPENSE_KEYWORDS  = ['pay bill', 'paybill', 'buy goods', 'lipa', 'airtime', 'fuliza', 'merchant', 'payment']

function classifyType(description, paidIn, withdrawn) {
  const desc = (description || '').toLowerCase()
  if (paidIn > 0) {
    // Incoming money is income unless it's a reversal of a transfer
    return 'income'
  }
  if (withdrawn > 0) {
    if (TRANSFER_KEYWORDS.some((k) => desc.includes(k))) return 'transfer'
    return 'expense'
  }
  return 'expense'
}

// ── Auto-category guesser ─────────────────────────────────
// Maps description keywords to IFAS category ids.
// Falls back to null so the user can pick in the preview step.
const CATEGORY_RULES = [
  { keywords: ['airtime', 'data bundle', 'safaricom'],  category_id: 'cat-airtime',       category_name: 'Airtime & Data' },
  { keywords: ['send money', 'sent to'],                 category_id: 'cat-mpesa-send',    category_name: 'M-Pesa Send Money' },
  { keywords: ['pay bill', 'paybill', 'kplc', 'electricity'], category_id: 'cat-utilities', category_name: 'Utilities (KPLC / Water)' },
  { keywords: ['nairobi water'],                         category_id: 'cat-utilities',     category_name: 'Utilities (KPLC / Water)' },
  { keywords: ['naivas', 'carrefour', 'chandarana', 'quickmart', 'grocery', 'supermarket'], category_id: 'cat-groceries', category_name: 'Groceries & Food' },
  { keywords: ['uber', 'bolt', 'matatu', 'transit', 'fuel', 'petrol', 'total', 'shell'],   category_id: 'cat-transport', category_name: 'Transport / Matatu' },
  { keywords: ['java', 'artcaffe', 'kfc', 'pizza', 'chicken inn', 'food'],                 category_id: 'cat-dining',    category_name: 'Dining & Eating Out' },
  { keywords: ['jumia', 'shopping', 'clothes', 'fashion', 'mr price'],                     category_id: 'cat-shopping',  category_name: 'Shopping & Clothing' },
  { keywords: ['hospital', 'clinic', 'pharmacy', 'nhif', 'health', 'medical'],             category_id: 'cat-healthcare',category_name: 'Healthcare / NHIF' },
  { keywords: ['school', 'fees', 'university', 'college', 'tuition', 'kcpe'],              category_id: 'cat-school',    category_name: 'School Fees' },
  { keywords: ['netflix', 'dstv', 'showmax', 'spotify', 'apple', 'subscription'],          category_id: 'cat-subscriptions', category_name: 'Subscriptions' },
  { keywords: ['salary', 'payroll', 'wages'],            category_id: 'cat-salary',        category_name: 'Salary' },
  { keywords: ['dividend', 'interest', 'investment'],    category_id: 'cat-investment',    category_name: 'Investment Income' },
  { keywords: ['chama'],                                 category_id: 'cat-chama',         category_name: 'Chama Contributions' },
]

function guessCategory(description, type) {
  if (type === 'transfer') return { category_id: null, category_name: null }
  const desc = (description || '').toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => desc.includes(k))) {
      return { category_id: rule.category_id, category_name: rule.category_name }
    }
  }
  return { category_id: null, category_name: null }
}

// ── Main text-extraction function ─────────────────────────
/**
 * Load a PDF file (File object) with an optional password, return all
 * text content as a single string.
 *
 * @param {File} file
 * @param {string} [password]
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file, password = '') {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    password: password || undefined,
  })

  const pdf = await loadingTask.promise
  const pages = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Join items preserving column spacing with a tab
    const pageText = content.items
      .map((item) => item.str)
      .join('\t')
    pages.push(pageText)
  }

  return pages.join('\n')
}

// ── Row parser ────────────────────────────────────────────
/**
 * Parse the raw text extracted from an M-Pesa PDF into an array of
 * normalised transaction objects ready for the IFAS import preview.
 *
 * Returns:
 *   {
 *     transactions: ParsedRow[],
 *     summary: { total, income_count, expense_count, transfer_count,
 *                total_paid_in, total_withdrawn, period_from, period_to },
 *     meta: { customer_name, mobile, statement_period }
 *   }
 *
 * ParsedRow:
 *   {
 *     receipt_no, date, description, type, amount,
 *     account_id, account_name,
 *     destination_account_id, destination_account_name,  (transfers only)
 *     category_id, category_name,       (auto-guessed, user can override)
 *     balance, notes,
 *     _raw: { paid_in, withdrawn }  (for display in preview)
 *   }
 */
export function parseMpesaText(rawText) {
  const lines = rawText.split(/\n/).map((l) => l.trim()).filter(Boolean)

  // ── Extract header metadata ───────────────────────────
  let customer_name     = ''
  let mobile_number     = ''
  let statement_period  = ''

  for (const line of lines) {
    const lc = line.toLowerCase()
    if (lc.includes('customer name') || lc.includes('full name')) {
      customer_name = line.split(/\t|:/).slice(1).join(' ').trim()
    }
    if (lc.includes('mobile number') || lc.includes('mobile no')) {
      mobile_number = line.split(/\t|:/).slice(1).join(' ').trim()
    }
    if (lc.includes('statement period')) {
      statement_period = line.split(/\t|:/).slice(1).join(' ').trim()
    }
  }

  // ── Find the data rows ────────────────────────────────
  // The header row contains "Receipt No" (case-insensitive).
  // All rows after it until end-of-document are data rows.
  const transactions = []
  let inDataSection  = false
  let headerCols     = []
  let period_from    = null
  let period_to      = null

  for (const line of lines) {
    const cols = line.split('\t').map((c) => c.trim())

    // Detect the column header row
    if (!inDataSection) {
      const joined = cols.join(' ').toLowerCase()
      if (joined.includes('receipt') && joined.includes('completion') && joined.includes('details')) {
        inDataSection = true
        headerCols    = cols
        continue
      }
      continue
    }

    // Skip obvious non-data lines
    if (cols.length < 4) continue
    if (cols[0].toLowerCase().includes('receipt')) continue // duplicate header
    const joined = cols.join(' ').toLowerCase()
    if (joined.includes('total') && joined.includes('transaction type')) continue
    if (joined.includes('summary')) continue

    // ── Map columns by header position ───────────────────
    // Fallback: try positional mapping if header detection found nothing
    // M-Pesa order: Receipt | Completion Time | Details | Status | Paid In | Withdrawn | Balance
    const idx = {
      receipt:    findColIdx(headerCols, ['receipt']),
      date:       findColIdx(headerCols, ['completion time', 'completion']),
      details:    findColIdx(headerCols, ['details']),
      status:     findColIdx(headerCols, ['status']),
      paid_in:    findColIdx(headerCols, ['paid in']),
      withdrawn:  findColIdx(headerCols, ['withdrawn', 'paid out']),
      balance:    findColIdx(headerCols, ['balance']),
    }

    const receipt    = cols[idx.receipt    ?? 0] ?? ''
    const dateRaw    = cols[idx.date       ?? 1] ?? ''
    const details    = cols[idx.details    ?? 2] ?? ''
    const status     = cols[idx.status     ?? 3] ?? ''
    const paidInRaw  = cols[idx.paid_in    ?? 4] ?? ''
    const withdrRaw  = cols[idx.withdrawn  ?? 5] ?? ''
    const balanceRaw = cols[idx.balance    ?? 6] ?? ''

    // Skip non-completed transactions
    if (status && !status.toLowerCase().includes('completed')) continue

    // Skip rows that don't look like data (no receipt number)
    if (!receipt || receipt.length < 6) continue

    const paidIn    = parseAmount(paidInRaw)
    const withdrawn = parseAmount(withdrRaw)
    const balance   = parseAmount(balanceRaw)

    // Skip zero-value rows
    if (paidIn === 0 && withdrawn === 0) continue

    const date = parseDate(dateRaw)
    if (!date) continue

    // Track period
    if (!period_from || date < period_from) period_from = date
    if (!period_to   || date > period_to)   period_to   = date

    const amount = paidIn > 0 ? paidIn : withdrawn
    const type   = classifyType(details, paidIn, withdrawn)
    const cat    = guessCategory(details, type)

    // For transfers, destination is encoded in Details
    // e.g. "Send Money to 0712345678 - John Doe"
    let dest_name = null
    if (type === 'transfer') {
      const m = details.match(/to\s+[\d]+\s*[-–]\s*(.+)/i)
        || details.match(/to\s+(.{3,40})\s*$/i)
      if (m) dest_name = m[1].trim()
    }

    transactions.push({
      receipt_no:                 receipt,
      date,
      description:                details,
      type,
      amount,
      account_id:                 'acc-mpesa',
      account_name:               'M-Pesa',
      destination_account_id:     type === 'transfer' ? null : null,
      destination_account_name:   type === 'transfer' ? (dest_name ?? 'External') : null,
      category_id:                cat.category_id,
      category_name:              cat.category_name,
      balance,
      notes:                      `Ref: ${receipt}`,
      _raw: { paid_in: paidIn, withdrawn },
    })
  }

  // Sort oldest → newest so imports are chronological
  transactions.sort((a, b) => (a.date > b.date ? 1 : -1))

  const income_count   = transactions.filter((t) => t.type === 'income').length
  const expense_count  = transactions.filter((t) => t.type === 'expense').length
  const transfer_count = transactions.filter((t) => t.type === 'transfer').length
  const total_paid_in  = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const total_withdrawn = transactions.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0)

  return {
    transactions,
    summary: {
      total: transactions.length,
      income_count,
      expense_count,
      transfer_count,
      total_paid_in:   Math.round(total_paid_in   * 100) / 100,
      total_withdrawn: Math.round(total_withdrawn * 100) / 100,
      period_from,
      period_to,
    },
    meta: { customer_name, mobile_number, statement_period },
  }
}

// ── Helper: find column index by keyword ──────────────────
function findColIdx(headers, keywords) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (keywords.some((k) => h.includes(k))) return i
  }
  return null
}
