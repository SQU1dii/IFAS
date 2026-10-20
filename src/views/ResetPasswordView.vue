<script setup>
/**
 * ResetPasswordView — set a new password via the emailed reset link.
 *
 * The link contains ?token=<jwt>. We read it from the query string and
 * POST it with the new password to /auth/reset-password.
 *
 * If no token is present, or the token is rejected by the backend,
 * the user is shown a clear error and directed back to /forgot-password.
 *
 * The password is never logged or stored beyond this form scope.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { runRules, required, minLength } from '@/utils/validation'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const token     = ref('')
const loading   = ref(false)
const apiError  = ref('')
const success   = ref(false)
const showPw    = ref(false)
const showCpw   = ref(false)

const form    = reactive({ password: '', confirmPassword: '' })
const touched = reactive({ password: false, confirmPassword: false })

onMounted(() => {
  token.value = String(route.query.token ?? '')
  if (!token.value) {
    apiError.value = 'No reset token found. Please request a new password-reset link.'
  }
})

const errors = computed(() => ({
  password: runRules(form.password, [
    [required,  'Password is required'],
    [minLength, 'Password must be at least 8 characters', 8],
  ]),
  confirmPassword: (() => {
    if (!form.confirmPassword) return 'Please confirm your password'
    if (form.confirmPassword !== form.password) return 'Passwords do not match'
    return null
  })(),
}))

const isValid = computed(() => !errors.value.password && !errors.value.confirmPassword)

// Password strength 0–4
const pwStrength = computed(() => {
  const p = form.password; if (!p) return 0
  let s = 0
  if (p.length >= 8)            s++
  if (/[A-Z]/.test(p))         s++
  if (/[0-9]/.test(p))         s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const pwStrengthLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength.value])
const pwStrengthColor = computed(() => ['', 'bg-rose-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][pwStrength.value])

async function handleSubmit() {
  touched.password = true; touched.confirmPassword = true
  if (!isValid.value || !token.value) return

  loading.value = true; apiError.value = ''
  try {
    await auth.resetPassword({ token: token.value, password: form.password, confirmPassword: form.confirmPassword })
    success.value = true
  } catch (err) {
    apiError.value = err?.message ?? 'Reset failed. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

    <!-- Brand mark -->
    <RouterLink
      to="/"
      class="flex items-center gap-2.5 mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-lg px-1"
    >
      <span class="h-9 w-9 rounded-xl bg-navy-800 flex items-center justify-center">
        <svg class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </span>
      <span class="text-xl font-bold text-navy-800 tracking-tight">IFAS</span>
    </RouterLink>

    <div class="w-full max-w-sm">
      <div class="card-pad animate-slide-up">

        <!-- ── Success state ───────────────────────────── -->
        <template v-if="success">
          <div class="text-center py-4">
            <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg class="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-navy-800 mb-2">Password updated</h1>
            <p class="text-sm text-slate-500 leading-relaxed">
              Your password has been changed. You can now sign in with your new credentials.
            </p>
            <RouterLink
              to="/login"
              class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Go to sign in
            </RouterLink>
          </div>
        </template>

        <!-- ── Form state ──────────────────────────────── -->
        <template v-else>
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-navy-800">Set new password</h1>
            <p class="mt-1 text-sm text-slate-500">
              Choose a strong password for your account.
            </p>
          </div>

          <!-- No token / expired token error -->
          <BaseAlert
            v-if="apiError"
            variant="error"
            class="mb-4"
            dismissible
            @dismiss="apiError = ''"
          >
            {{ apiError }}
            <span v-if="!token">
              <RouterLink to="/forgot-password" class="underline font-medium">Request a new link →</RouterLink>
            </span>
          </BaseAlert>

          <form v-if="token" novalidate class="space-y-4" @submit.prevent="handleSubmit">

            <!-- New password -->
            <div class="field">
              <label for="rp-password" class="field-label">
                New password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <input
                  id="rp-password"
                  v-model="form.password"
                  :type="showPw ? 'text' : 'password'"
                  placeholder="Min. 8 characters"
                  autocomplete="new-password"
                  class="input pr-11"
                  :class="touched.password && errors.password ? 'input-error' : ''"
                  :aria-invalid="!!(touched.password && errors.password)"
                  @blur="touched.password = true"
                />
                <button
                  type="button"
                  :aria-label="showPw ? 'Hide password' : 'Show password'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
                  @click="showPw = !showPw"
                >
                  <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path v-if="!showPw" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>

              <!-- Strength meter -->
              <div v-if="form.password" class="mt-2 space-y-1">
                <div class="flex gap-1">
                  <div
                    v-for="i in 4" :key="i"
                    :class="['h-1 flex-1 rounded-full transition-all duration-300', i <= pwStrength ? pwStrengthColor : 'bg-slate-200']"
                  />
                </div>
                <p class="text-xs" :class="pwStrength >= 3 ? 'text-emerald-600' : pwStrength === 2 ? 'text-amber-600' : 'text-rose-500'">
                  {{ pwStrengthLabel }}
                </p>
              </div>

              <p v-if="touched.password && errors.password" class="field-error mt-1" role="alert">
                {{ errors.password }}
              </p>
            </div>

            <!-- Confirm password -->
            <div class="field">
              <label for="rp-confirm" class="field-label">
                Confirm password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <input
                  id="rp-confirm"
                  v-model="form.confirmPassword"
                  :type="showCpw ? 'text' : 'password'"
                  placeholder="Repeat your new password"
                  autocomplete="new-password"
                  class="input pr-11"
                  :class="touched.confirmPassword && errors.confirmPassword ? 'input-error' : ''"
                  :aria-invalid="!!(touched.confirmPassword && errors.confirmPassword)"
                  @blur="touched.confirmPassword = true"
                />
                <button
                  type="button"
                  :aria-label="showCpw ? 'Hide password' : 'Show password'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
                  @click="showCpw = !showCpw"
                >
                  <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path v-if="!showCpw" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
              <p v-if="touched.confirmPassword && errors.confirmPassword" class="field-error" role="alert">
                {{ errors.confirmPassword }}
              </p>
            </div>

            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="loading"
              :disabled="loading"
              class="w-full"
            >
              {{ loading ? 'Updating…' : 'Set new password' }}
            </BaseButton>
          </form>
        </template>

      </div>

      <p class="mt-5 text-center text-sm text-slate-500">
        <RouterLink
          to="/login"
          class="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
