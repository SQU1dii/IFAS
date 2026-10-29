<script setup>
/**
 * ForgotPasswordView — email-based password reset request page.
 *
 * The success message never confirms whether the email is registered
 * (prevents user-enumeration attacks). The backend enforces this too,
 * but we mirror it on the frontend so the UX is consistent.
 */
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { runRules, required, isEmail } from '@/utils/validation'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput  from '@/components/common/BaseInput.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'

const auth = useAuthStore()

const form       = reactive({ email: '' })
const touched    = reactive({ email: false })
const loading    = ref(false)
const submitted  = ref(false)  // show success state after request
const apiError   = ref('')

const errors = computed(() => ({
  email: runRules(form.email, [
    [required, 'Email is required'],
    [isEmail,  'Enter a valid email address'],
  ]),
}))

async function handleSubmit() {
  touched.email = true
  if (errors.value.email) return

  loading.value  = true
  apiError.value = ''

  try {
    await auth.forgotPassword(form.email)
    submitted.value = true
  } catch (err) {
    // Show a generic message — don't reveal whether the email exists.
    apiError.value = err?.message ?? 'Something went wrong. Please try again.'
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

        <!-- ── Success state ──────────────────────────────── -->
        <template v-if="submitted">
          <div class="text-center py-4">
            <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg class="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-navy-800 mb-2">Check your email</h1>
            <p class="text-sm text-slate-500 leading-relaxed">
              If an account exists for
              <strong class="text-navy-700">{{ form.email }}</strong>,
              we've sent a password reset link. It may take a few minutes to arrive.
            </p>
            <p class="mt-3 text-xs text-slate-400">
              Didn't get it? Check your spam folder, or
              <button
                type="button"
                class="text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
                @click="submitted = false"
              >
                try again
              </button>.
            </p>
          </div>
        </template>

        <!-- ── Form state ──────────────────────────────────── -->
        <template v-else>
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-navy-800">Reset your password</h1>
            <p class="mt-1 text-sm text-slate-500">
              Enter the email address linked to your account and we'll send you a reset link.
            </p>
          </div>

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

            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="loading"
              :disabled="loading"
              class="w-full"
            >
              {{ loading ? 'Sending…' : 'Send reset link' }}
            </BaseButton>
          </form>
        </template>

      </div>

      <!-- Back to login -->
      <p class="mt-5 text-center text-sm text-slate-500">
        <RouterLink
          to="/login"
          class="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
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
