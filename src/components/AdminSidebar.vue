<script setup>
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

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
    <!-- Header -->
    <div class="sidebar-header">
      <div class="logo">Mariles</div>
      <span class="role-badge">Admin</span>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <div class="nav-section">
        <span class="section-label">MENU UTAMA</span>
        
        <router-link to="/admin/dashboard" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </router-link>

        <router-link to="/admin/users" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Pengguna</span>
        </router-link>

        <router-link to="/admin/les-places" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Tempat Les</span>
        </router-link>

        <router-link to="/admin/reports" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
          <span>Laporan</span>
        </router-link>

        <router-link to="/admin/finance" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>Keuangan</span>
        </router-link>

        <router-link to="/admin/moderation" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Moderasi</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <div class="nav-section">
        <span class="section-label">KONTEN</span>

        <router-link to="/admin/banners" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span>Banner</span>
        </router-link>

        <router-link to="/admin/vouchers" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>Voucher</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <div class="nav-section">
        <span class="section-label">LAINNYA</span>

        <router-link to="/admin/notifications" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notifikasi</span>
        </router-link>

        <router-link to="/admin/settings" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Pengaturan</span>
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
</template>

<style scoped>
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
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

.logo { font-size: 22px; font-weight: 700; }

.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #DC2626;
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
