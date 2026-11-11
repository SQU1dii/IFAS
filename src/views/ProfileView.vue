<script setup>
/**
 * ProfileView — view and edit the authenticated user's profile.
 *
 * Sections:
 *   1. Profile details — name, email, phone (edit in-place)
 *   2. Change password — current, new, confirm (separate form)
 *
 * Both forms validate client-side first, then surface any server
 * field errors next to the relevant input.
 * Password is never stored beyond the form scope.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore }  from '@/stores/auth'
import authService       from '@/services/authService'
import { runRules, required, isEmail, minLength, matches } from '@/utils/validation'

import PageHeader  from '@/components/common/PageHeader.vue'
import BaseCard    from '@/components/common/BaseCard.vue'
import BaseButton  from '@/components/common/BaseButton.vue'
import BaseInput   from '@/components/common/BaseInput.vue'
import BaseAlert   from '@/components/common/BaseAlert.vue'

const auth = useAuthStore()

// ── Profile form ─────────────────────────────────────────
const profileForm    = reactive({ name: '', email: '', phone: '' })
const profileTouched = reactive({})
const profileSaving  = ref(false)
const profileMsg     = ref('')
const profileErr     = ref('')
const profileFieldErr = ref({})

onMounted(() => {
  profileForm.name  = auth.user?.name  ?? ''
  profileForm.email = auth.user?.email ?? ''
  profileForm.phone = auth.user?.phone ?? ''
})

const profileErrors = computed(() => ({
  name:  runRules(profileForm.name,  [[required, 'Name is required'], [minLength, 'Name must be at least 2 characters', 2]]),
  email: runRules(profileForm.email, [[required, 'Email is required'], [isEmail, 'Enter a valid email address']]),
  phone: null, // optional
}))

const pFieldErr = (f) =>
  profileTouched[f] ? (profileFieldErr.value[f] || profileErrors.value[f] || '') : ''

const profileValid = computed(() => !profileErrors.value.name && !profileErrors.value.email)

async function saveProfile() {
  profileTouched.name = true; profileTouched.email = true
  if (!profileValid.value) return
  profileSaving.value = true; profileMsg.value = ''; profileErr.value = ''; profileFieldErr.value = {}
  try {
    const updated = await authService.updateProfile({
      name:  profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim() || null,
    })
    auth.updateUser(updated)
    profileMsg.value = 'Profile updated successfully.'
  } catch (e) {
    profileErr.value      = e?.message ?? 'Failed to update profile.'
    profileFieldErr.value = e?.fieldErrors ?? {}
  } finally { profileSaving.value = false }
}

// ── Change password form ──────────────────────────────────
const pwForm    = reactive({ current_password: '', new_password: '', confirm_password: '' })
const pwTouched = reactive({})
const pwSaving  = ref(false)
const pwMsg     = ref('')
const pwErr     = ref('')
const pwFieldErr = ref({})
const showPw = reactive({ current: false, new: false, confirm: false })

const pwErrors = computed(() => ({
  current_password:  runRules(pwForm.current_password,  [[required, 'Current password is required']]),
  new_password:      runRules(pwForm.new_password,      [[required, 'New password is required'], [minLength, 'Must be at least 8 characters', 8]]),
  confirm_password:  (() => {
    if (!pwForm.confirm_password) return 'Please confirm your new password'
    if (pwForm.confirm_password !== pwForm.new_password) return 'Passwords do not match'
    return null
  })(),
}))

const pwFieldErrFn = (f) =>
  pwTouched[f] ? (pwFieldErr.value[f] || pwErrors.value[f] || '') : ''

const pwValid = computed(() =>
  !pwErrors.value.current_password &&
  !pwErrors.value.new_password &&
  !pwErrors.value.confirm_password
)

// Password strength 0–4
const pwStrength = computed(() => {
  const p = pwForm.new_password; if (!p) return 0
  let s = 0
  if (p.length >= 8)            s++
  if (/[A-Z]/.test(p))         s++
  if (/[0-9]/.test(p))         s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const pwStrengthLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength.value])
const pwStrengthColor = computed(() =>
  ['', 'bg-rose-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][pwStrength.value])

async function changePassword() {
  Object.keys(pwErrors.value).forEach((k) => (pwTouched[k] = true))
  if (!pwValid.value) return
  pwSaving.value = true; pwMsg.value = ''; pwErr.value = ''; pwFieldErr.value = {}
  try {
    await authService.changePassword({
      current_password: pwForm.current_password,
      new_password:     pwForm.new_password,
      confirm_password: pwForm.confirm_password,
    })
    pwMsg.value = 'Password changed successfully.'
    // Clear form after success
    pwForm.current_password = ''; pwForm.new_password = ''; pwForm.confirm_password = ''
    Object.keys(pwTouched).forEach((k) => delete pwTouched[k])
  } catch (e) {
    pwErr.value      = e?.message ?? 'Failed to change password.'
    pwFieldErr.value = e?.fieldErrors ?? {}
  } finally { pwSaving.value = false }
}

// User initials for avatar
const initials = computed(() => auth.initials)
</script>

<template>
  <div class="space-y-5 animate-fade-in max-w-2xl">

    <PageHeader title="Profile" subtitle="Manage your personal details and password" />

    <!-- ── Avatar + name banner ──────────────────────────── -->
    <BaseCard class="flex items-center gap-4">
      <span class="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0" aria-hidden="true">
        {{ initials }}
      </span>
      <div class="min-w-0">
        <p class="text-lg font-bold text-navy-800 truncate">{{ auth.user?.name }}</p>
        <p class="text-sm text-slate-500 truncate">{{ auth.user?.email }}</p>
        <p v-if="auth.user?.phone" class="text-xs text-slate-400 mt-0.5">{{ auth.user.phone }}</p>
      </div>
    </BaseCard>

    <!-- ── Profile details ───────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Personal Details</h2>
      </div>
      <div class="px-5 py-5 space-y-4">
        <BaseAlert v-if="profileMsg" variant="success" dismissible @dismiss="profileMsg = ''">{{ profileMsg }}</BaseAlert>
        <BaseAlert v-if="profileErr" variant="error"   dismissible @dismiss="profileErr = ''">{{ profileErr }}</BaseAlert>

        <BaseInput
          v-model="profileForm.name"
          label="Full name" placeholder="e.g. Amara Wanjiku"
          required
          :error="pFieldErr('name')"
          @blur="profileTouched.name = true"
        />
        <BaseInput
          v-model="profileForm.email"
          label="Email address" type="email"
          placeholder="you@example.co.ke"
          required
          :error="pFieldErr('email')"
          @blur="profileTouched.email = true"
        />
        <BaseInput
          v-model="profileForm.phone"
          label="Phone number"
          type="tel"
          placeholder="+254 7XX XXX XXX"
          hint="Optional — used for account recovery."
          :error="pFieldErr('phone')"
        />

        <div class="flex justify-end pt-1">
          <BaseButton variant="primary" :loading="profileSaving" @click="saveProfile">
            Save changes
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ── Change password ───────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Change Password</h2>
      </div>
      <div class="px-5 py-5 space-y-4">
        <BaseAlert v-if="pwMsg" variant="success" dismissible @dismiss="pwMsg = ''">{{ pwMsg }}</BaseAlert>
        <BaseAlert v-if="pwErr" variant="error"   dismissible @dismiss="pwErr = ''">{{ pwErr }}</BaseAlert>

        <!-- Current password -->
        <div class="field">
          <label for="cur-pw" class="field-label">
            Current password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="cur-pw"
              v-model="pwForm.current_password"
              :type="showPw.current ? 'text' : 'password'"
              class="input pr-11"
              :class="pwTouched.current_password && pwErrors.current_password ? 'input-error' : ''"
              autocomplete="current-password"
              :aria-invalid="!!(pwTouched.current_password && pwErrors.current_password)"
              @blur="pwTouched.current_password = true"
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
              :aria-label="showPw.current ? 'Hide' : 'Show'" @click="showPw.current = !showPw.current">
              <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path v-if="!showPw.current" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>
          <p v-if="pwTouched.current_password && pwErrors.current_password" class="field-error" role="alert">
            {{ pwFieldErrFn('current_password') }}
          </p>
        </div>

        <!-- New password -->
        <div class="field">
          <label for="new-pw" class="field-label">
            New password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="new-pw"
              v-model="pwForm.new_password"
              :type="showPw.new ? 'text' : 'password'"
              class="input pr-11"
              :class="pwTouched.new_password && pwErrors.new_password ? 'input-error' : ''"
              autocomplete="new-password"
              :aria-invalid="!!(pwTouched.new_password && pwErrors.new_password)"
              @blur="pwTouched.new_password = true"
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
              :aria-label="showPw.new ? 'Hide' : 'Show'" @click="showPw.new = !showPw.new">
              <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path v-if="!showPw.new" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>

          <!-- Strength meter -->
          <div v-if="pwForm.new_password" class="mt-2 space-y-1">
            <div class="flex gap-1">
              <div v-for="i in 4" :key="i"
                :class="['h-1 flex-1 rounded-full transition-all duration-300', i <= pwStrength ? pwStrengthColor : 'bg-slate-200']" />
            </div>
            <p class="text-xs" :class="pwStrength >= 3 ? 'text-emerald-600' : pwStrength === 2 ? 'text-amber-600' : 'text-rose-500'">
              {{ pwStrengthLabel }}
            </p>
          </div>

          <p v-if="pwTouched.new_password && pwErrors.new_password" class="field-error mt-1" role="alert">
            {{ pwFieldErrFn('new_password') }}
          </p>
        </div>

        <!-- Confirm new password -->
        <div class="field">
          <label for="conf-pw" class="field-label">
            Confirm new password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="conf-pw"
              v-model="pwForm.confirm_password"
              :type="showPw.confirm ? 'text' : 'password'"
              class="input pr-11"
              :class="pwTouched.confirm_password && pwErrors.confirm_password ? 'input-error' : ''"
              autocomplete="new-password"
              :aria-invalid="!!(pwTouched.confirm_password && pwErrors.confirm_password)"
              @blur="pwTouched.confirm_password = true"
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
              :aria-label="showPw.confirm ? 'Hide' : 'Show'" @click="showPw.confirm = !showPw.confirm">
              <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path v-if="!showPw.confirm" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          </div>
          <p v-if="pwTouched.confirm_password && pwErrors.confirm_password" class="field-error" role="alert">
            {{ pwFieldErrFn('confirm_password') }}
          </p>
        </div>

        <div class="flex justify-end pt-1">
          <BaseButton variant="primary" :loading="pwSaving" @click="changePassword">
            Change password
          </BaseButton>
        </div>
      </div>
    </BaseCard>

  </div>
</template>
