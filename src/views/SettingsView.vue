<script setup>
/**
 * SettingsView — workspace settings + user preferences.
 *
 * Sections:
 *   1. Workspace info (name, type, currency) — read-only for non-admins
 *   2. Display preferences (currency, date format, theme)
 *   3. Notification preferences (budget alerts, goal reminders, insights)
 *   4. Danger zone (leave workspace, delete workspace — admin only)
 *
 * In mock mode changes are applied to the local user object only.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter }         from 'vue-router'
import { useAuthStore }      from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { useUiStore }        from '@/stores/ui'
import authService from '@/services/authService'

import PageHeader  from '@/components/common/PageHeader.vue'
import BaseCard    from '@/components/common/BaseCard.vue'
import BaseButton  from '@/components/common/BaseButton.vue'
import BaseInput   from '@/components/common/BaseInput.vue'
import BaseSelect  from '@/components/common/BaseSelect.vue'
import BaseAlert   from '@/components/common/BaseAlert.vue'
import BaseBadge   from '@/components/common/BaseBadge.vue'
import { formatCurrency } from '@/utils/format'

const auth   = useAuthStore()
const ws     = useWorkspaceStore()
const ui     = useUiStore()
const router = useRouter()

const saving    = ref(false)
const saveMsg   = ref('')
const saveError = ref('')

// ── Display preferences ──────────────────────────────────
const prefs = reactive({
  currency:   auth.user?.currency   ?? 'KES',
  date_format: auth.user?.date_format ?? 'DD/MM/YYYY',
  theme:      auth.user?.theme      ?? 'light',
})

const currencyOptions = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'USD', label: 'USD — US Dollar'        },
  { value: 'EUR', label: 'EUR — Euro'             },
  { value: 'GBP', label: 'GBP — British Pound'   },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
]

const dateFormatOptions = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Kenyan)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)'     },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)'     },
]

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark',  label: 'Dark (coming soon)' },
]

async function savePrefs() {
  saving.value = true; saveError.value = ''; saveMsg.value = ''
  try {
    await authService.updateProfile(prefs)
    auth.updateUser(prefs)
    saveMsg.value = 'Preferences saved.'
  } catch (e) {
    saveError.value = e?.message ?? 'Failed to save preferences.'
  } finally { saving.value = false }
}

// ── Notification preferences ──────────────────────────────
const notifPrefs = reactive({
  budget_alerts:         auth.user?.notification_prefs?.budget_alerts         ?? true,
  goal_reminders:        auth.user?.notification_prefs?.goal_reminders        ?? true,
  insight_notifications: auth.user?.notification_prefs?.insight_notifications ?? true,
})

async function saveNotifPrefs() {
  saving.value = true; saveError.value = ''; saveMsg.value = ''
  try {
    await authService.updateProfile({ notification_prefs: notifPrefs })
    auth.updateUser({ notification_prefs: notifPrefs })
    saveMsg.value = 'Notification preferences saved.'
  } catch (e) {
    saveError.value = e?.message ?? 'Failed to save.'
  } finally { saving.value = false }
}

const canEditWorkspace = computed(() => ws.can('settings.write'))
</script>

<template>
  <div class="space-y-5 animate-fade-in max-w-2xl">

    <PageHeader title="Settings" subtitle="Manage your preferences and workspace" />

    <!-- Save feedback -->
    <BaseAlert v-if="saveMsg"   variant="success" dismissible @dismiss="saveMsg = ''">{{ saveMsg }}</BaseAlert>
    <BaseAlert v-if="saveError" variant="error"   dismissible @dismiss="saveError = ''">{{ saveError }}</BaseAlert>

    <!-- ── Profile summary ───────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <h2 class="section-title">Your Profile</h2>
        <RouterLink to="/profile" class="text-xs font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded">
          Edit profile →
        </RouterLink>
      </div>
      <div class="px-5 py-4 flex items-center gap-4">
        <span class="shrink-0 h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold" aria-hidden="true">
          {{ auth.initials }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-navy-800 truncate">{{ auth.user?.name }}</p>
          <p class="text-xs text-slate-500 truncate">{{ auth.user?.email }}</p>
          <p v-if="auth.user?.phone" class="text-xs text-slate-400 mt-0.5">{{ auth.user.phone }}</p>
        </div>
        <RouterLink to="/profile" class="shrink-0">
          <BaseButton variant="secondary" size="sm">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit
          </BaseButton>
        </RouterLink>
      </div>
    </BaseCard>

    <!-- ── Workspace info ────────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Workspace</h2>
      </div>
      <div class="px-5 py-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">Name</span>
          <span class="text-sm font-medium text-navy-800">{{ ws.active?.name ?? '—' }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">Type</span>
          <BaseBadge variant="blue" size="sm" class="capitalize">{{ ws.wsType?.toLowerCase() }}</BaseBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">Currency</span>
          <span class="text-sm font-medium text-navy-800">{{ ws.currency }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-500">Your role</span>
          <BaseBadge variant="purple" size="sm" class="capitalize">{{ ws.role }}</BaseBadge>
        </div>
      </div>
    </BaseCard>

    <!-- ── Display preferences ───────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Display Preferences</h2>
      </div>
      <div class="px-5 py-4 space-y-4">
        <BaseSelect v-model="prefs.currency" label="Currency" :options="currencyOptions" />
        <BaseSelect v-model="prefs.date_format" label="Date format" :options="dateFormatOptions" />
        <BaseSelect v-model="prefs.theme" label="Theme" :options="themeOptions" />
        <div class="flex justify-end pt-2">
          <BaseButton variant="primary" :loading="saving" @click="savePrefs">Save preferences</BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ── Notification preferences ──────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Notification Preferences</h2>
      </div>
      <div class="px-5 py-4 space-y-4">
        <label v-for="(label, key) in { budget_alerts: 'Budget alerts', goal_reminders: 'Savings goal reminders', insight_notifications: 'Insight notifications' }" :key="key"
          class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-navy-700">{{ label }}</span>
          <button
            type="button"
            role="switch"
            :aria-checked="notifPrefs[key]"
            :aria-label="label"
            :class="[
              'relative h-6 w-11 rounded-full transition',
              notifPrefs[key] ? 'bg-emerald-500' : 'bg-slate-300',
            ]"
            @click="notifPrefs[key] = !notifPrefs[key]"
          >
            <span
              :class="[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                notifPrefs[key] ? 'left-5' : 'left-0.5',
              ]"
            />
          </button>
        </label>
        <div class="flex justify-end pt-2">
          <BaseButton variant="primary" :loading="saving" @click="saveNotifPrefs">Save notifications</BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ── Sign out ──────────────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Session</h2>
      </div>
      <div class="px-5 py-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-navy-800">{{ auth.user?.name }}</p>
          <p class="text-xs text-slate-500">{{ auth.user?.email }}</p>
        </div>
        <BaseButton variant="danger" @click="auth.logout().then(() => router.push('/login'))">
          Sign out
        </BaseButton>
      </div>
    </BaseCard>

  </div>
</template>
