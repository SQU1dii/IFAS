import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import workspaceService from '@/services/workspaceService'

/**
 * Workspace store — the single source of truth for the active workspace.
 *
 * Every API call that is workspace-scoped reads wsId from here.
 * The active workspace id is persisted to localStorage so a page refresh
 * restores it automatically. The server is still the authority — the store
 * re-fetches workspace details on restore so stale data is not used.
 *
 * Workspace types: PERSONAL | BUSINESS | ORGANIZATION
 *
 * Role codes (returned by the server per workspace):
 *   owner | admin | member | viewer
 *
 * Permission codes (subset returned by the server, used for UI gating).
 * These MUST match the codes in Back End/src/config/constants.js PERMISSIONS:
 *   transactions.view   transactions.create   transactions.edit   transactions.void
 *   budgets.manage
 *   members.manage
 *   departments.manage
 *   reports.generate
 *   analytics.view
 *   accounts.manage
 *   goals.manage
 *   dashboard.view
 *   assistant.use
 *   settings.write
 */

const WS_KEY = 'ifas_workspace_id'

export const useWorkspaceStore = defineStore('workspace', () => {
  // ── State ─────────────────────────────────────────────────
  const workspaces  = ref([])              // all workspaces the user belongs to
  const active      = ref(null)            // full workspace object (includes role + permissions)
  const loading     = ref(false)
  const loadError   = ref('')

  // ── Derived ───────────────────────────────────────────────
  const wsId    = computed(() => active.value?.id ?? null)
  const wsType  = computed(() => active.value?.type ?? null)   // PERSONAL | BUSINESS | ORGANIZATION
  const role    = computed(() => active.value?.my_role ?? null)
  const perms   = computed(() => new Set(active.value?.my_permissions ?? []))
  const currency = computed(() => active.value?.currency ?? 'KES')

  const isPersonal     = computed(() => wsType.value === 'PERSONAL')
  const isBusiness     = computed(() => wsType.value === 'BUSINESS')
  const isOrganization = computed(() => wsType.value === 'ORGANIZATION')
  const isOwnerOrAdmin = computed(() => ['owner', 'admin'].includes(role.value))

  function can(permission) {
    // Owners and admins always have full access — safety net so
    // permission-code mismatches never lock out power users.
    if (['owner', 'admin'].includes(role.value)) return true
    return perms.value.has(permission)
  }

  // ── Actions ───────────────────────────────────────────────

  /** Load the full list of workspaces the authenticated user belongs to. */
  async function loadWorkspaces() {
    loading.value = true; loadError.value = ''
    try {
      workspaces.value = await workspaceService.list()
    } catch (e) {
      loadError.value = e?.message ?? 'Failed to load workspaces.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Activate a workspace by id. Fetches full details (including role +
   * permissions) and persists the id so it survives a page refresh.
   */
  async function activate(id) {
    loading.value = true; loadError.value = ''
    try {
      const ws = await workspaceService.get(id)
      active.value = ws
      localStorage.setItem(WS_KEY, id)
    } catch (e) {
      loadError.value = e?.message ?? 'Failed to load workspace.'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * On app boot: restore the previously active workspace from localStorage.
   * Returns true if restored, false if the user needs to pick one.
   */
  async function restore() {
    const savedId = localStorage.getItem(WS_KEY)
    if (!savedId) return false
    try {
      await activate(savedId)
      return true
    } catch {
      localStorage.removeItem(WS_KEY)
      return false
    }
  }

  async function create(payload) {
    const ws = await workspaceService.create(payload)
    workspaces.value.push(ws)
    return ws
  }

  function clear() {
    active.value = null
    workspaces.value = []
    localStorage.removeItem(WS_KEY)
  }

  return {
    workspaces, active, loading, loadError,
    wsId, wsType, role, perms, currency,
    isPersonal, isBusiness, isOrganization, isOwnerOrAdmin,
    can,
    loadWorkspaces, activate, restore, create, clear,
  }
})
