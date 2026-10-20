/**
 * useTransactionPage — shared logic for Income, Expenses, and any other
 * view that renders a filtered list of transactions plus an add-form.
 *
 * The caller passes a fixed `lockedType` ('income' | 'expense') so the
 * filter bar hides the type selector and the modal pre-selects the type.
 */
import { ref, reactive, watch, onMounted, computed } from 'vue'
import transactionService from '@/services/transactionService'
import authService        from '@/services/authService'

export function useTransactionPage(lockedType = null) {
  // ── Reference data ──────────────────────────────────────
  const categories = ref([])
  const accounts   = ref([])

  async function loadReference() {
    try {
      const [cats, accs] = await Promise.all([
        authService.getCategories(),
        authService.getAccounts(),
      ])
      categories.value = cats.filter((c) => !lockedType || c.type === lockedType)
      accounts.value   = accs
    } catch { /* non-critical */ }
  }

  // ── Filters ─────────────────────────────────────────────
  const filters = reactive({
    search: '', category_id: '', account_id: '', from: '', to: '',
  })
  const page = ref(1)

  // ── Transactions list ───────────────────────────────────
  const transactions = ref([])
  const meta         = ref({})
  const loading      = ref(false)
  const fetchError   = ref('')

  async function load() {
    loading.value = true; fetchError.value = ''
    try {
      const res = await transactionService.list({
        page:        page.value,
        page_size:   15,
        type:        lockedType || undefined,
        search:      filters.search      || undefined,
        category_id: filters.category_id || undefined,
        account_id:  filters.account_id  || undefined,
        from:        filters.from        || undefined,
        to:          filters.to          || undefined,
      })
      transactions.value = res.data
      meta.value         = res.meta ?? {}
    } catch (err) {
      fetchError.value = err?.message ?? 'Failed to load transactions.'
    } finally {
      loading.value = false }
  }

  let searchTimer = null
  watch(() => filters.search, () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
  })
  watch(() => [filters.category_id, filters.account_id, filters.from, filters.to],
    () => { page.value = 1; load() })
  watch(page, load)

  onMounted(() => { loadReference(); load() })

  // ── Category summary (derived from current page data) ───
  // Full breakdown comes from analytics; this is a quick local summary.
  const categorySummary = computed(() => {
    const map = {}
    for (const t of transactions.value) {
      const key = t.category_name ?? 'Uncategorized'
      map[key] = (map[key] ?? 0) + t.amount
    }
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  })

  const pageTotal = computed(() =>
    transactions.value.reduce((s, t) => s + t.amount, 0)
  )

  // ── Add / Edit modal ────────────────────────────────────
  const modalOpen      = ref(false)
  const editTarget     = ref(null)
  const modalLoading   = ref(false)
  const modalApiError  = ref('')
  const modalFieldErrs = ref({})

  function openAdd() {
    editTarget.value = null
    modalApiError.value = ''; modalFieldErrs.value = {}
    modalOpen.value = true
  }
  function openEdit(txn) {
    editTarget.value = txn
    modalApiError.value = ''; modalFieldErrs.value = {}
    modalOpen.value = true
  }
  function closeModal() { modalOpen.value = false }

  async function handleSave(payload) {
    modalLoading.value = true; modalApiError.value = ''; modalFieldErrs.value = {}
    // Lock the type so a user can't switch from income to expense via this form.
    const finalPayload = lockedType ? { ...payload, type: lockedType } : payload
    try {
      if (editTarget.value) await transactionService.update(editTarget.value.id, finalPayload)
      else                  await transactionService.create(finalPayload)
      closeModal(); load()
    } catch (err) {
      modalApiError.value  = err?.message ?? 'Save failed.'
      modalFieldErrs.value = err?.fieldErrors ?? {}
    } finally { modalLoading.value = false }
  }

  // ── Delete modal ────────────────────────────────────────
  const deleteTarget  = ref(null)
  const deleteLoading = ref(false)
  const deleteError   = ref('')

  function openDelete(txn) { deleteTarget.value = txn; deleteError.value = '' }
  function closeDelete()   { deleteTarget.value = null }

  async function handleDelete() {
    deleteLoading.value = true; deleteError.value = ''
    try { await transactionService.remove(deleteTarget.value.id); closeDelete(); load() }
    catch (err) { deleteError.value = err?.message ?? 'Delete failed.' }
    finally { deleteLoading.value = false }
  }

  return {
    // reference
    categories, accounts,
    // filters
    filters, page,
    // list
    transactions, meta, loading, fetchError, load,
    // derived
    categorySummary, pageTotal,
    // add/edit
    modalOpen, editTarget, modalLoading, modalApiError, modalFieldErrs,
    openAdd, openEdit, closeModal, handleSave,
    // delete
    deleteTarget, deleteLoading, deleteError,
    openDelete, closeDelete, handleDelete,
  }
}
