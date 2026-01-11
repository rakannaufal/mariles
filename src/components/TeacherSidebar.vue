<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherData } from '@/composables/useTeacherData'
import FloatingChatWidget from './FloatingChatWidget.vue'
import LogoutConfirmationModal from '@/components/modals/LogoutConfirmationModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const { lesPlace, fetchTeacherProfile } = useTeacherData()

const isChatPage = computed(() => route.path.includes('/teacher/chat'))

onMounted(async () => {
  await fetchTeacherProfile()
})

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
      <div class="logo">Mariles</div>
      <span class="role-badge">Guru</span>
      <div v-if="lesPlace?.name" class="les-place-badge" :title="lesPlace.name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ lesPlace.name }}</span>
      </div>
    </div>
    
    <!-- Navigation -->
    <nav class="nav">
      <!-- Menu Utama -->
      <div class="nav-section">
        <span class="section-label">MENU UTAMA</span>
        
        <router-link to="/teacher/dashboard" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </router-link>
        
        <router-link to="/teacher/profile" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profil</span>
        </router-link>
        
        <router-link to="/teacher/schedule" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Jadwal</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Akademik -->
      <div class="nav-section">
        <span class="section-label">AKADEMIK</span>
        
        <router-link to="/teacher/students" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Siswa</span>
        </router-link>
        
        <router-link to="/teacher/attendance" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Absensi</span>
        </router-link>
        
        <router-link to="/teacher/materials" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Materi</span>
        </router-link>
        
        <router-link to="/teacher/grades" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Nilai</span>
        </router-link>
        
        <router-link to="/teacher/quiz" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Quiz / Ujian</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Keuangan -->
      <div class="nav-section">
        <span class="section-label">KEUANGAN</span>
        
        <router-link to="/teacher/finance" class="nav-item">
          <span class="rp-icon">Rp</span>
          <span>Keuangan</span>
        </router-link>
        
        <router-link to="/teacher/performance" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Performa</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Lainnya -->
      <div class="nav-section">
        <span class="section-label">LAINNYA</span>
        
        <router-link to="/teacher/chat" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </router-link>
        
        <router-link to="/teacher/notifications" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notifikasi</span>
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
  
  <FloatingChatWidget v-if="!isChatPage" user-role="teacher" />

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
  gap: 10px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.logo { font-size: 22px; font-weight: 700; }

.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #10B981;
}

.les-place-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 10px;
}
.les-place-badge svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; }
.les-place-badge span { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

.nav-divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 8px 0; }

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
.rp-icon { width: 20px; font-size: 12px; font-weight: 800; text-align: center; }
.nav-item:hover { background: rgba(255, 255, 255, 0.1); color: white; }
.nav-item.router-link-active { background: rgba(255, 255, 255, 0.15); color: white; font-weight: 600; }

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
