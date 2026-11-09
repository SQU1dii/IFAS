<script setup>
/**
 * MembersView — BUSINESS and ORGANIZATION workspaces.
 * Invite members, change roles, remove members.
 * Role options: admin | member | viewer
 * (Owner role is permanent and cannot be changed from the UI.)
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import workspaceService from '@/services/workspaceService'
import { formatDate } from '@/utils/format'
import { runRules, required, isEmail } from '@/utils/validation'

import PageHeader         from '@/components/common/PageHeader.vue'
import BaseButton         from '@/components/common/BaseButton.vue'
import BaseCard           from '@/components/common/BaseCard.vue'
import BaseAlert          from '@/components/common/BaseAlert.vue'
import BaseInput          from '@/components/common/BaseInput.vue'
import BaseSelect         from '@/components/common/BaseSelect.vue'
import BaseBadge          from '@/components/common/BaseBadge.vue'
import BaseSpinner        from '@/components/common/BaseSpinner.vue'
import EmptyState         from '@/components/common/EmptyState.vue'
import DeleteConfirmModal from '@/components/transactions/DeleteConfirmModal.vue'

const ws = useWorkspaceStore()

const members    = ref([])
const loading    = ref(false)
const fetchError = ref('')

async function load() {
  if (!ws.wsId) return
  loading.value = true; fetchError.value = ''
  try { members.value = await workspaceService.listMembers(ws.wsId) }
  catch (e) { fetchError.value = e?.message ?? 'Failed to load members.' }
  finally   { loading.value = false }
}
onMounted(load)

// ── Role helpers ─────────────────────────────────────────
// Backend returns full role names like "PERSONAL Owner", "BUSINESS Owner",
// "ORGANIZATION Admin" etc. Map these to display labels and badge colours.
const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin'  },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
]

function roleDisplay(roleStr) {
  if (!roleStr) return 'Member'
  const r = String(roleStr).toLowerCase()
  if (r.includes('owner') || r.includes('admin')) return 'Admin'
  if (r.includes('manager') || r.includes('finance officer') || r.includes('dept head')) return 'Manager'
  if (r.includes('viewer')) return 'Viewer'
  return 'Member'
}

const roleBadge = {
  Admin:   'purple',
  Manager: 'blue',
  Member:  'green',
  Viewer:  'neutral',
  owner:   'purple',
  admin:   'purple',
  manager: 'blue',
  member:  'green',
  viewer:  'neutral',
}

// ── Invite modal ─────────────────────────────────────────
const inviteOpen    = ref(false)
const inviteLoading = ref(false)
const inviteErr     = ref('')

const invite  = reactive({ email: '', role: 'member' })
const touched = reactive({ email: false })

const emailError = computed(() => {
  if (!touched.email) return ''
  return runRules(invite.email, [[required, 'Email is required'], [isEmail, 'Enter a valid email']])
})

async function handleInvite() {
  touched.email = true
  if (emailError.value) return
  inviteLoading.value = true; inviteErr.value = ''
  try {
    const m = await workspaceService.inviteMember(ws.wsId, { email: invite.email.trim(), role: invite.role })
    members.value.push(m)
    invite.email = ''; invite.role = 'member'; touched.email = false
    inviteOpen.value = false
  } catch (e) {
    inviteErr.value = e?.message ?? 'Invite failed.'
  } finally { inviteLoading.value = false }
}

// ── Role change ──────────────────────────────────────────
const changingRole = ref(null)

async function changeRole(member, newRole) {
  if (member.role === 'owner') return   // cannot change owner
  changingRole.value = member.id
  try {
    const updated = await workspaceService.updateMemberRole(ws.wsId, member.id, newRole)
    const idx = members.value.findIndex((m) => m.id === member.id)
    if (idx !== -1) members.value[idx] = { ...members.value[idx], role: updated.role }
  } catch (e) { fetchError.value = e?.message ?? 'Failed to update role.' }
  finally { changingRole.value = null }
}

// ── Remove member ────────────────────────────────────────
const removeTarget  = ref(null)
const removeLoading = ref(false)

function openRemove(m)  { removeTarget.value = m }
function closeRemove()  { removeTarget.value = null }

async function handleRemove() {
  removeLoading.value = true
  try {
    await workspaceService.removeMember(ws.wsId, removeTarget.value.id)
    members.value = members.value.filter((m) => m.id !== removeTarget.value.id)
    closeRemove()
  } catch (e) { fetchError.value = e?.message ?? 'Remove failed.' }
  finally { removeLoading.value = false }
}

const canManage = computed(() => ws.can('members.write'))
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader
      title="Members & Roles"
      :subtitle="`${ws.active?.name ?? ''} · ${members.length} member${members.length !== 1 ? 's' : ''}`"
    >
      <template #actions>
        <BaseButton v-if="canManage" variant="primary" size="sm" @click="inviteOpen = true">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          Invite member
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">{{ fetchError }}</BaseAlert>

    <!-- Role legend -->
    <BaseCard class="flex flex-wrap gap-4 text-xs">
      <div v-for="r in ['owner', 'admin', 'member', 'viewer']" :key="r" class="flex items-center gap-1.5">
        <BaseBadge :variant="roleBadge[r]" size="sm">{{ r }}</BaseBadge>
        <span class="text-slate-500">{{
          { owner: 'Full control', admin: 'Manage team + data', member: 'Add + edit data', viewer: 'Read only' }[r]
        }}</span>
      </div>
    </BaseCard>

    <div v-if="loading" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>

    <EmptyState v-else-if="!members.length" title="No members yet" message="Invite people to collaborate on this workspace." icon="savings">
      <template #action>
        <BaseButton v-if="canManage" variant="primary" size="sm" @click="inviteOpen = true">Invite first member</BaseButton>
      </template>
    </EmptyState>

    <BaseCard v-else no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Workspace members</h2>
      </div>
      <ul class="divide-y divide-slate-100" role="list">
        <li v-for="m in members" :key="m.id" class="flex items-center gap-4 px-5 py-4">
          <!-- Avatar -->
          <span class="shrink-0 h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
            {{ m.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() }}
          </span>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium text-navy-800 truncate">{{ m.name }}</p>
              <!-- Current user indicator -->
              <span v-if="m.user_id === 'user-001'" class="text-xs text-slate-400">(you)</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">{{ m.email }}</p>
            <p class="text-xs text-slate-400 mt-0.5">Joined {{ formatDate(m.joined_at) }}</p>
          </div>
          <!-- Role selector / badge -->
          <div class="shrink-0">
            <span v-if="roleDisplay(m.role) === 'Admin' && m.user_id === ws.active?.created_by || !canManage">
              <BaseBadge :variant="roleBadge[roleDisplay(m.role)] ?? 'neutral'" size="sm">{{ roleDisplay(m.role) }}</BaseBadge>
            </span>
            <div v-else class="flex items-center gap-2">
              <select
                :value="m.role"
                :disabled="changingRole === m.id"
                class="input py-1 text-xs w-28"
                :aria-label="'Role for ' + m.name"
                @change="changeRole(m, $event.target.value)"
              >
                <option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <BaseButton
                variant="ghost" size="sm" icon-only
                :aria-label="'Remove ' + m.name"
                @click="openRemove(m)"
              >
                <svg class="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </BaseButton>
            </div>
          </div>
        </li>
      </ul>
    </BaseCard>

    <!-- Invite modal -->
    <Transition name="modal">
      <div v-if="inviteOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true" aria-label="Invite member">
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="inviteOpen = false" />
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">Invite member</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="inviteOpen = false">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="inviteErr" variant="error">{{ inviteErr }}</BaseAlert>
            <BaseInput
              v-model="invite.email"
              label="Email address" type="email"
              placeholder="colleague@example.co.ke"
              required :error="emailError"
              @blur="touched.email = true"
            />
            <BaseSelect v-model="invite.role" label="Role" :options="ROLE_OPTIONS" required />
            <p class="text-xs text-slate-400 leading-relaxed">
              The invited person will receive an email with a link to join this workspace.
            </p>
          </div>
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="inviteOpen = false">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="inviteLoading" @click="handleInvite">Send invite</BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Remove confirm -->
    <DeleteConfirmModal
      :open="!!removeTarget" :loading="removeLoading"
      title="Remove member"
      :message="removeTarget ? 'Remove ' + removeTarget.name + ' from this workspace? They will lose access immediately.' : ''"
      @close="closeRemove" @confirm="handleRemove"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
