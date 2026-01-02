<script setup>
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { usePlatformSettings } from './composables/usePlatformSettings'
import { computed, watch, ref, onMounted } from 'vue'
import MaintenancePage from './views/MaintenancePage.vue'

const authStore = useAuthStore()
const route = useRoute()
const { isMaintenanceModeAsync } = usePlatformSettings()

// Maintenance status from Supabase
const maintenanceEnabled = ref(false)
const maintenanceLoaded = ref(false)

// Load maintenance mode from Supabase on mount
onMounted(async () => {
  try {
    maintenanceEnabled.value = await isMaintenanceModeAsync()
  } catch (err) {
    console.error('Error checking maintenance mode:', err)
    maintenanceEnabled.value = false
  }
  maintenanceLoaded.value = true
})

// Re-check maintenance mode when route changes
watch(() => route.path, async () => {
  try {
    maintenanceEnabled.value = await isMaintenanceModeAsync()
  } catch (err) {
    maintenanceEnabled.value = false
  }
})

// Show maintenance page if enabled and user is not admin
const showMaintenancePage = computed(() => {
  if (!maintenanceLoaded.value) return false
  if (!maintenanceEnabled.value) return false
  
  // Allow admin users to access the site
  if (authStore.userProfile?.role === 'admin') return false
  
  // Allow access to login/register routes
  const allowedRoutes = ['/admin', '/login', '/register']
  if (allowedRoutes.some(r => route.path.startsWith(r))) return false
  
  return true
})
</script>

<template>
  <div id="app-container">
    <!-- Maintenance Mode -->
    <MaintenancePage v-if="showMaintenancePage && !authStore.loading" />
    
    <!-- Normal App -->
    <RouterView v-else-if="!authStore.loading" />
    
    <!-- Loading Screen -->
    <div v-else class="loading-screen">
      <div class="loading-content">
        <div class="loading-logo">
          <span class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </span>
          <span class="logo-text">Mariles</span>
        </div>
        <div class="loading-spinner"></div>
        <p class="loading-text">Memuat aplikasi...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app-container {
  min-height: 100vh;
}

.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--background) 0%, rgba(136, 208, 228, 0.1) 100%);
}

.loading-content {
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

.loading-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.logo-icon {
  width: 48px;
  height: 48px;
  color: var(--secondary);
}
.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  font-size: var(--font-size-4xl);
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto var(--spacing-lg);
}

.loading-text {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
</style>
