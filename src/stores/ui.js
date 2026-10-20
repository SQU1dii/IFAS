import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UI store — cross-component UI state: the desktop sidebar collapse flag,
 * the mobile drawer, the date-filter range selection, and notifications.
 *
 * Centralizing these here means the sidebar, topbar, and content area can
 * all read/write shared state without prop-drilling.
 */
export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const mobileMenuOpen = ref(false)

  // Shared date-range selection driven by the top-bar filter.
  const rangePreset = ref('this_month')
  const customRange = ref(null) // { start, end } ISO when preset is 'custom'

  // Sample notifications (would come from the backend in production).
  const notifications = ref([
    { id: 1, title: 'Budget alert', body: 'Dining Out is at 92% of its limit.', read: false, type: 'warning' },
    { id: 2, title: 'Salary received', body: 'Your monthly salary was credited.', read: false, type: 'positive' },
    { id: 3, title: 'New insight', body: 'Your savings rate improved this month.', read: true, type: 'info' },
  ])

  const unreadCount = () => notifications.value.filter((n) => !n.read).length

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(value) {
    sidebarCollapsed.value = value
  }

  function openMobileMenu() {
    mobileMenuOpen.value = true
  }

  function closeMobileMenu() {
    mobileMenuOpen.value = false
  }

  function toggleMobileMenu() {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  function setRangePreset(key) {
    rangePreset.value = key
    customRange.value = null
  }

  function setCustomRange(start, end) {
    customRange.value = { start, end }
    rangePreset.value = 'custom'
  }

  function markAllRead() {
    notifications.value.forEach((n) => (n.read = true))
  }

  return {
    sidebarCollapsed,
    mobileMenuOpen,
    rangePreset,
    customRange,
    notifications,
    unreadCount,
    toggleSidebar,
    setSidebarCollapsed,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    setRangePreset,
    setCustomRange,
    markAllRead,
  }
})
