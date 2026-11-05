<script setup>
/**
 * WorkspaceSelectionView — F2
 *
 * Shown after login when the user either has no active workspace or
 * explicitly wants to switch. The user can:
 *   • Select an existing workspace from the list
 *   • Create a new one (name, type, currency)
 *
 * On selection the workspace store activates the workspace and the router
 * guard redirects to the appropriate dashboard.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore }      from '@/stores/auth'
import { runRules, required, minLength } from '@/utils/validation'
import BaseButton  from '@/components/common/BaseButton.vue'
import BaseInput   from '@/components/common/BaseInput.vue'
import BaseSelect  from '@/components/common/BaseSelect.vue'
import BaseAlert   from '@/components/common/BaseAlert.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const router = useRouter()
const ws   = useWorkspaceStore()
const auth = useAuthStore()

// ── Load workspaces ─────────────────────────────────────────
onMounted(() => ws.loadWorkspaces())

// ── Select existing ─────────────────────────────────────────
const selecting = ref(null)
const selectErr = ref('')

async function select(id) {
  selecting.value = id; selectErr.value = ''
  try {
    await ws.activate(id)
    router.push({ name: 'dashboard' })
  } catch (e) {
    selectErr.value = e?.message ?? 'Failed to activate workspace.'
    selecting.value = null
  }
}

// ── Create new ──────────────────────────────────────────────
const showCreate = ref(false)
const creating   = ref(false)
const createErr  = ref('')

const form    = reactive({ name: '', type: 'PERSONAL', currency: 'KES' })
const touched = reactive({ name: false })

const typeOptions = [
  { value: 'PERSONAL',     label: 'Personal' },
  { value: 'BUSINESS',     label: 'Business' },
  { value: 'ORGANIZATION', label: 'Organization' },
]
const currencyOptions = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'USD', label: 'USD — US Dollar'        },
  { value: 'EUR', label: 'EUR — Euro'             },
  { value: 'GBP', label: 'GBP — British Pound'   },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
]

const errors = computed(() => ({
  name: runRules(form.name, [[required, 'Name is required'], [minLength, 'Name must be at least 3 characters', 3]]),
}))
const nameError = computed(() => touched.name ? errors.value.name : '')
const isValid = computed(() => !errors.value.name)

async function handleCreate() {
  touched.name = true
  if (!isValid.value) return
  creating.value = true; createErr.value = ''
  try {
    const newWs = await ws.create({ name: form.name.trim(), type: form.type, currency: form.currency })
    await ws.activate(newWs.id)
    router.push({ name: 'dashboard' })
  } catch (e) {
    createErr.value = e?.message ?? 'Failed to create workspace.'
  } finally {
    creating.value = false
  }
}

const typeIcon = { PERSONAL: '👤', BUSINESS: '💼', ORGANIZATION: '🏢' }
const typeDesc = {
  PERSONAL:     'Track your personal income, expenses, savings, and budgets.',
  BUSINESS:     'Manage business finances, net profit, and team access.',
  ORGANIZATION: 'Multi-department budgets, roles, and spending oversight.',
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

    <!-- Brand -->
    <div class="flex items-center gap-2.5 mb-8">
      <span class="h-9 w-9 rounded-xl bg-navy-800 flex items-center justify-center">
        <svg class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </span>
      <span class="text-xl font-bold text-navy-800">IFAS</span>
    </div>

    <div class="w-full max-w-lg">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-navy-800">Select a workspace</h1>
        <p class="mt-1 text-sm text-slate-500">
          Welcome back, {{ auth.user?.name?.split(' ')[0] ?? 'there' }}.
          Choose a workspace to continue.
        </p>
      </div>

      <BaseAlert v-if="selectErr" variant="error" class="mb-4" dismissible @dismiss="selectErr = ''">
        {{ selectErr }}
      </BaseAlert>

      <!-- Workspace list -->
      <div v-if="ws.loading" class="flex justify-center py-12">
        <BaseSpinner size="lg" label="Loading workspaces…" />
      </div>

      <div v-else-if="ws.loadError" class="card-pad text-center text-rose-600 text-sm">
        {{ ws.loadError }}
      </div>

      <ul v-else class="space-y-3" role="list">
        <li
          v-for="space in ws.workspaces"
          :key="space.id"
        >
          <button
            type="button"
            class="w-full text-left card-pad flex items-center gap-4 hover:shadow-card-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-2xl"
            :aria-label="`Select workspace ${space.name}`"
            :disabled="selecting === space.id"
            @click="select(space.id)"
          >
            <span class="text-2xl shrink-0" aria-hidden="true">{{ typeIcon[space.type] ?? '📁' }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-navy-800 truncate">{{ space.name }}</p>
              <p class="text-xs text-slate-500 mt-0.5 capitalize">
                {{ space.type.toLowerCase() }} · {{ space.currency }} · {{ space.my_role }}
              </p>
            </div>
            <span v-if="selecting === space.id" class="shrink-0">
              <BaseSpinner size="sm" />
            </span>
            <svg v-else class="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </li>

        <!-- Create new button -->
        <li>
          <button
            type="button"
            class="w-full text-left card-pad flex items-center gap-4 border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-2xl"
            @click="showCreate = !showCreate"
          >
            <span class="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <span class="text-sm font-medium text-slate-600">Create a new workspace</span>
          </button>
        </li>
      </ul>

      <!-- Create workspace form -->
      <Transition name="slide-up">
        <div v-if="showCreate" class="mt-4 card-pad space-y-4 animate-slide-up">
          <h2 class="text-sm font-semibold text-navy-800">New workspace</h2>

          <BaseAlert v-if="createErr" variant="error" dismissible @dismiss="createErr = ''">
            {{ createErr }}
          </BaseAlert>

          <BaseInput
            v-model="form.name"
            label="Workspace name"
            placeholder="e.g. Wanjiku Ventures Ltd"
            required
            :error="nameError"
            @blur="touched.name = true"
          />

          <div class="grid grid-cols-2 gap-4">
            <BaseSelect v-model="form.type" label="Type" :options="typeOptions" required />
            <BaseSelect v-model="form.currency" label="Currency" :options="currencyOptions" required />
          </div>

          <!-- Type description -->
          <p class="text-xs text-slate-500 leading-relaxed">
            {{ typeDesc[form.type] }}
          </p>

          <div class="flex gap-3 justify-end pt-1">
            <BaseButton variant="secondary" @click="showCreate = false">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="creating" @click="handleCreate">
              Create workspace
            </BaseButton>
          </div>
        </div>
      </Transition>

      <!-- Sign out -->
      <div class="mt-6 text-center">
        <button
          type="button"
          class="text-xs text-slate-400 hover:text-rose-500 transition"
          @click="auth.logout().then(() => router.push('/login'))"
        >
          Sign out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(6px); }
</style>
