import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { supabase } from './lib/supabase'
import './index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Handle OAuth callback if present
async function handleOAuthCallback() {
  // Check if URL contains OAuth callback hash
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (session && !error) {
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname)
    }
  }
}

// Initialize auth before mounting
const authStore = useAuthStore()
handleOAuthCallback().then(() => {
  authStore.initialize().then(() => {
    app.mount('#app')
  })
})

