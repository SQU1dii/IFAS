import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dashboardService from '@/services/dashboardService'

/**
 * UI store — cross-component state.
 * Sidebar collapse, mobile drawer, date-range selection, notifications.
 */
export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const mobileMenuOpen   = ref(false)

  // Date-range driven by the topbar picker.
  const rangePreset  = ref('this_month')
  const customRange  = ref(null) // { start, end } ISO strings

  // Notifications — loaded from the API, not hardcoded.
  const notifications = ref([])
  const notifLoading  = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

  // ── Sidebar ───────────────────────────────────────────────
  function toggleSidebar()          { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setSidebarCollapsed(v)   { sidebarCollapsed.value = v }
  function openMobileMenu()         { mobileMenuOpen.value = true }
  function closeMobileMenu()        { mobileMenuOpen.value = false }
  function toggleMobileMenu()       { mobileMenuOpen.value = !mobileMenuOpen.value }

  // ── Date range ────────────────────────────────────────────
  function setRangePreset(key) { rangePreset.value = key; customRange.value = null }
  function setCustomRange(s, e) { customRange.value = { start: s, end: e }; rangePreset.value = 'custom' }

  // ── Notifications ─────────────────────────────────────────
  async function loadNotifications() {
    if (notifLoading.value) return
    notifLoading.value = true
    try {
      notifications.value = await dashboardService.getNotifications()
    } catch { /* silent */ } finally {
      notifLoading.value = false
    }
  }

  async function markRead(id) {
    await dashboardService.markNotificationRead(id)
    const n = notifications.value.find((n) => n.id === id)
    if (n) n.is_read = true
  }

  async function markAllRead() {
    await dashboardService.markAllNotificationsRead()
    notifications.value.forEach((n) => (n.is_read = true))
  }

  return {
    sidebarCollapsed, mobileMenuOpen,
    rangePreset, customRange,
    notifications, notifLoading, unreadCount,
    toggleSidebar, setSidebarCollapsed,
    openMobileMenu, closeMobileMenu, toggleMobileMenu,
    setRangePreset, setCustomRange,
    loadNotifications, markRead, markAllRead,
  }
})
