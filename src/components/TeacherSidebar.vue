<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTeacherData } from '@/composables/useTeacherData'
import FloatingChatButton from './FloatingChatButton.vue'

const authStore = useAuthStore()
const { lesPlace, fetchTeacherProfile } = useTeacherData()

onMounted(async () => {
  await fetchTeacherProfile()
})

async function handleLogout() {
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
    <div class="logo">Mariles</div>
    <div class="badge-row">
      <span class="role-badge">Guru</span>
      <span class="les-place-badge" v-if="lesPlace?.name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {{ lesPlace.name }}
      </span>
    </div>
    
    <nav class="nav">
      <!-- Menu Utama -->
      <div class="nav-section">
        <h3 class="section-label">MENU UTAMA</h3>
        <router-link to="/teacher/dashboard" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </router-link>
        <router-link to="/teacher/schedule" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Jadwal
        </router-link>
         <router-link to="/teacher/profile" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profil
        </router-link>
      </div>

      <!-- Akademik -->
      <div class="nav-section">
        <h3 class="section-label">AKADEMIK</h3>
        <router-link to="/teacher/students" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Siswa
        </router-link>
        <router-link to="/teacher/attendance" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Absensi
        </router-link>
        <router-link to="/teacher/materials" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Materi
        </router-link>
        <router-link to="/teacher/grades" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Nilai
        </router-link>
        <router-link to="/teacher/quiz" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Quiz / Ujian
        </router-link>
      </div>

      <!-- Administrasi -->
      <div class="nav-section">
        <h3 class="section-label">ADMINISTRASI</h3>
        <router-link to="/teacher/finance" class="nav-item">
          <span style="font-weight: 800; font-size: 14px; width: 20px; text-align: center;">Rp</span>
          Keuangan
        </router-link>
        <router-link to="/teacher/performance" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Performa
        </router-link>
        <router-link to="/teacher/chat" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </router-link>
        <router-link to="/teacher/notifications" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Notifikasi
        </router-link>
      </div>
    </nav>

    <button class="logout-btn" @click="handleLogout">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Keluar
    </button>
  </aside>
  
  <!-- Floating Chat Button -->
  <FloatingChatButton chat-route="/teacher/chat" />
</template>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--secondary);
  color: white;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.logo {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  flex-shrink: 0;
}

.role-badge {
  font-size: var(--font-size-xs);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: var(--radius-full);
}

.les-place-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.les-place-badge svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  overflow-y: auto;
  min-height: 0;
  padding-right: 4px;
}

.nav::-webkit-scrollbar {
  width: 4px;
}

.nav::-webkit-scrollbar-track {
  background: transparent;
}

.nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--spacing-md);
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
  margin: 16px 0 8px 12px;
  font-weight: 600;
}
.nav-section:first-child .section-label {
  margin-top: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-sm);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.nav-item svg {
  width: 20px;
  height: 20px;
}

.nav-item:hover,
.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.router-link-active {
  font-weight: 600;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  color: rgba(255, 255, 255, 0.7);
  margin-top: auto;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  width: 100%;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
