import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

import './assets/main.css'

async function bootstrap() {
  const app    = createApp(App)
  const pinia  = createPinia()

  app.use(pinia)
  app.use(router)

  // 1. Restore the auth session from the HttpOnly refresh-token cookie.
  const auth = useAuthStore()
  await auth.restoreSession()

  // 2. If the user is authenticated, try to restore the active workspace.
  //    If neither succeeds the router guards redirect to /login or /workspaces.
  if (auth.isLoggedIn) {
    const ws = useWorkspaceStore()
    await ws.restore()
  }

  app.mount('#app')
}

bootstrap()
