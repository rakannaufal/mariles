<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChat } from '@/composables/useChat'
import FloatingChatWidget from '@/components/FloatingChatWidget.vue'
import LogoutConfirmationModal from '@/components/modals/LogoutConfirmationModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const { getTotalUnreadCount } = useChat()

const isChatPage = computed(() => route.path.includes('/student/chat'))
const unreadCount = ref(0)

onMounted(async () => {
  if (authStore.user?.id) {
    try {
      unreadCount.value = await getTotalUnreadCount(authStore.user.id)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }
})

// Logout Logic
const showLogoutModal = ref(false)

function handleLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  try {
    await authStore.signOut()
  } catch (err) {
    console.error('Logout error:', err)
  }
  window.location.href = '/'
}

</script>

<template>
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <router-link to="/" class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <span>Mariles</span>
      </router-link>
      <span class="role-badge">Siswa</span>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <!-- Home Link -->
      <router-link to="/" class="nav-item home-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Beranda Utama</span>
      </router-link>

      <div class="nav-divider"></div>

      <!-- Menu Utama -->
      <div class="nav-section">
        <span class="section-label">MENU UTAMA</span>
        
        <router-link to="/student/dashboard" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </router-link>

        <router-link to="/student/profile" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profil</span>
        </router-link>


        <router-link to="/student/bookings" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Booking</span>
        </router-link>

        <router-link to="/student/progress" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Progres Belajar</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Lainnya -->
      <div class="nav-section">
        <span class="section-label">LAINNYA</span>

        <router-link to="/student/favorites" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>Favorit</span>
        </router-link>


        <router-link to="/student/notifications" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notifikasi</span>
        </router-link>

        <router-link to="/student/settings" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Pengaturan</span>
        </router-link>

        <router-link to="/student/refund" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span>Ajukan Refund</span>
        </router-link>
      </div>
    </nav>

    <!-- Logout -->
    <button class="logout-btn" @click="handleLogout">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      <span>Keluar</span>
    </button>
  </aside>
  
  <FloatingChatWidget v-if="!isChatPage" user-role="student" />
  
  <LogoutConfirmationModal 
    :show="showLogoutModal" 
    @close="showLogoutModal = false" 
    @confirm="confirmLogout"
  />
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #0a4568 0%, #063048 100%);
  color: white;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  text-decoration: none;
  color: white;
}
.logo svg { width: 26px; height: 26px; }

.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #3B82F6;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 6px;
  margin-bottom: 16px;
}
.nav::-webkit-scrollbar { width: 4px; }
.nav::-webkit-scrollbar-track { background: transparent; }
.nav::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }

.nav-section { display: flex; flex-direction: column; gap: 2px; }

.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(255, 255, 255, 0.4);
  padding: 12px 14px 8px;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}
.nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
.nav-item:hover { background: rgba(255, 255, 255, 0.1); color: white; }
.nav-item.router-link-active { background: rgba(255, 255, 255, 0.15); color: white; font-weight: 600; }

.home-link {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}
.home-link:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); }

.badge {
  margin-left: auto;
  background: #EF4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  flex-shrink: 0;
}
.logout-btn svg { width: 20px; height: 20px; }
.logout-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; border-color: rgba(255, 255, 255, 0.3); }

@media (max-width: 768px) { .sidebar { display: none; } }
</style>
