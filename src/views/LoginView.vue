<script setup>
/**
 * LoginView — sign-in page.
 *
 * - Authenticated users are redirected to the dashboard by the router guard;
 *   this view never renders for them.
 * - Client-side validation gives instant feedback; the backend is always the
 *   final authority and any API error is displayed verbatim.
 * - No passwords are logged, stored beyond the form scope, or sent anywhere
 *   other than the auth service.
 * - Redirects to the original destination after login (via ?redirect= query).
 */
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { runRules, required, isEmail, minLength } from '@/utils/validation'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput  from '@/components/common/BaseInput.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'

const router  = useRouter()
const route   = useRoute()
const auth    = useAuthStore()

// ── Form state ───────────────────────────────────────────
const form = reactive({ email: '', password: '' })
const touched = reactive({ email: false, password: false })
const loading = ref(false)
const apiError = ref('')
const showPassword = ref(false)

// ── Validation ────────────────────────────────────────────
const errors = computed(() => ({
  email:    runRules(form.email, [
    [required, 'Email is required'],
    [isEmail,  'Enter a valid email address'],
  ]),
  password: runRules(form.password, [
    [required,   'Password is required'],
    [minLength,  'Password must be at least 8 characters', 8],
  ]),
}))

const isFormValid = computed(() => !errors.value.email && !errors.value.password)

// ── Submit ────────────────────────────────────────────────
async function handleSubmit() {
  // Mark all fields touched so every error is shown.
  touched.email    = true
  touched.password = true
  if (!isFormValid.value) return

  loading.value  = true
  apiError.value = ''

  try {
    await auth.login({ email: form.email, password: form.password })
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : { name: 'dashboard' })
  } catch (err) {
    apiError.value = err?.message ?? 'Sign in failed. Please try again.'
  } finally {
    loading.value = false
  }
}

// Show a "session expired" note if the Axios interceptor redirected here.
const sessionExpired = computed(() => route.query.expired === '1')
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">

    <!-- Brand mark -->
    <RouterLink
      to="/"
      class="flex items-center gap-2.5 mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-lg px-1"
    >
      <span class="h-9 w-9 rounded-xl bg-navy-800 flex items-center justify-center">
        <svg class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </span>
      <span class="text-xl font-bold text-navy-800 tracking-tight">IFAS</span>
    </RouterLink>

    <!-- Card -->
    <div class="w-full max-w-sm">
      <div class="card-pad animate-slide-up">

        <div class="mb-6">
          <h1 class="text-2xl font-bold text-navy-800">Welcome back</h1>
          <p class="mt-1 text-sm text-slate-500">Sign in to your financial dashboard</p>
        </div>

        <!-- Session-expired notice -->
        <BaseAlert v-if="sessionExpired" variant="warning" class="mb-4" dismissible>
          Your session expired. Please sign in again.
        </BaseAlert>

        <!-- API error -->
        <BaseAlert v-if="apiError" variant="error" class="mb-4" dismissible @dismiss="apiError = ''">
          {{ apiError }}
        </BaseAlert>

        <form novalidate class="space-y-4" @submit.prevent="handleSubmit">
          <BaseInput
            v-model="form.email"
            label="Email address"
            type="email"
            placeholder="you@example.co.ke"
            autocomplete="email"
            required
            :error="touched.email ? errors.email : ''"
            @blur="touched.email = true"
          />

          <!-- Password with show/hide toggle -->
          <div class="field">
            <label for="login-password" class="field-label">
              Password <span class="text-rose-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <div class="relative">
              <input
                id="login-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                class="input pr-11"
                :class="touched.password && errors.password ? 'input-error' : ''"
                :aria-invalid="!!(touched.password && errors.password)"
                aria-describedby="login-password-error"
                @blur="touched.password = true"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" class="h-4.5 w-4.5 h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <svg v-else class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </button>
            </div>
            <p v-if="touched.password && errors.password" id="login-password-error" class="field-error" role="alert">
              {{ errors.password }}
            </p>
          </div>

          <!-- Forgot password -->
          <div class="flex justify-end -mt-1">
            <RouterLink
              to="/forgot-password"
              class="text-sm text-emerald-600 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
            >
              Forgot password?
            </RouterLink>
          </div>

          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="loading"
            :disabled="loading"
            class="w-full mt-2"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </BaseButton>
        </form>
      </div>

      <!-- Register link -->
      <p class="mt-5 text-center text-sm text-slate-500">
        Don't have an account?
        <RouterLink
          to="/register"
          class="font-medium text-emerald-600 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
        >
          Create one free
        </RouterLink>
      </p>
    </div>
  </div>
</template>
