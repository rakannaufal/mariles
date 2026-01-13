<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { getUnreadCount, subscribeToNotifications } from '@/services/notificationService'
import { useChat } from '@/composables/useChat'
import LogoutConfirmationModal from '@/components/modals/LogoutConfirmationModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const lesPlaceName = ref('')
const unreadCount = ref(0)
const unreadChatCount = ref(0)
let notificationSubscription = null
let chatSubscription = null
const { getTotalUnreadCount } = useChat()

async function updateUnreadCount() {
  if (authStore.user?.id) {
    const { count } = await getUnreadCount(authStore.user.id)
    unreadCount.value = count
  }
}

async function updateUnreadChatCount() {
  if (authStore.user?.id) {
    unreadChatCount.value = await getTotalUnreadCount(authStore.user.id)
  }
}

const subscribeToChatNotifications = () => {
  if (!authStore.user?.id) return

  chatSubscription = supabase
    .channel('owner-umum-sidebar-chat')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      async (payload) => {
        if (payload.new.sender_id !== authStore.user.id) {
           await updateUnreadChatCount()
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'is_read=eq.true'
      },
      async () => {
        await updateUnreadChatCount()
      }
    )
    .subscribe()
}

async function fetchLesPlace() {
  if (!authStore.user?.id) return
  
  try {
    const { data: owner } = await supabase.from('owners').select('id').eq('user_id', authStore.user.id).single()
    if (owner) {
      const { data: lesPlace } = await supabase.from('les_places').select('name').eq('owner_id', owner.id).single()
      if (lesPlace) lesPlaceName.value = lesPlace.name
    }
  } catch (err) {
    console.error('Error fetching les place:', err)
  }
}

onMounted(async () => { 
  if (authStore.user?.id) {
    fetchLesPlace()
    await updateUnreadCount()
    await updateUnreadChatCount()
    
    notificationSubscription = subscribeToNotifications(authStore.user.id, () => {
      updateUnreadCount()
    })
    
    subscribeToChatNotifications()
  }
})

onUnmounted(() => {
  if (notificationSubscription) {
    notificationSubscription.unsubscribe()
  }
  if (chatSubscription) {
    supabase.removeChannel(chatSubscription)
  }
})

// Watch for route changes (especially when going to/from chat)
watch(() => route.path, async () => {
  if (authStore.user?.id) {
    setTimeout(async () => {
      await updateUnreadChatCount()
    }, 1000)
  }
})

watch(() => authStore.user, (newUser) => { 
  if (newUser?.id) {
    fetchLesPlace() 
    updateUnreadCount()
    updateUnreadChatCount()
  }
}, { immediate: true })

const showLogoutModal = ref(false)

function handleLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  try { await authStore.signOut() } catch (err) { console.error('Logout error:', err) }
  window.location.href = '/'
}
</script>

<template>
  <aside class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="logo">Mariles</div>
      <div class="badge-row">
        <span class="role-badge">Pemilik</span>
        <span class="type-badge">Umum</span>
      </div>
      <div v-if="lesPlaceName" class="les-place-badge" :title="lesPlaceName">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ lesPlaceName }}</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <!-- Menu Utama -->
      <div class="nav-section">
        <span class="section-label">MENU UTAMA</span>
        
        <router-link to="/owner/dashboard" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </router-link>

        <router-link to="/owner/profile" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Profil</span>
        </router-link>

        <router-link to="/owner/les" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>Kelola Tempat Les</span>
        </router-link>

        <router-link to="/owner/programs" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Program</span>
        </router-link>

        <router-link to="/owner/registrations" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Pendaftaran</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Manajemen -->
      <div class="nav-section">
        <span class="section-label">MANAJEMEN</span>

        <router-link to="/owner/teachers" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Guru</span>
        </router-link>

        <router-link to="/owner/vouchers" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>Voucher</span>
        </router-link>

        <router-link to="/owner/finance" class="nav-item">
          <span class="rp-icon">Rp</span>
          <span>Keuangan</span>
        </router-link>

        <router-link to="/owner/reviews" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Ulasan</span>
        </router-link>
      </div>

      <div class="nav-divider"></div>

      <!-- Lainnya -->
      <div class="nav-section">
        <span class="section-label">LAINNYA</span>

        <router-link to="/owner/chat" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
          <span v-if="unreadChatCount > 0" class="badge">{{ unreadChatCount }}</span>
        </router-link>

        <router-link to="/owner/notifications" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notifikasi</span>
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
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

.badge-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #8B5CF6;
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

.badge {
  background: #EF4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: auto;
  line-height: 1.4;
}
</style>
