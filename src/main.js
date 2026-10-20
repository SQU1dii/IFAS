import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // Attempt to restore the session from the HttpOnly refresh-token cookie
  // before the router fires its first navigation. This prevents a flash of
  // the login page when the user has a valid session after a page refresh.
  const auth = useAuthStore()
  await auth.restoreSession()

  app.mount('#app')
}

bootstrap()
