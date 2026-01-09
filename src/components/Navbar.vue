<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCategories } from '@/composables/useCategories'
import { supabase } from '@/lib/supabase'
import FloatingChatWidget from '@/components/FloatingChatWidget.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { categories, fetchCategories } = useCategories()

// Check if current page is a chat page
const isChatPage = computed(() => route.path.includes('/chat'))

const showProfileMenu = ref(false)
const showNotifications = ref(false)
const showCategories = ref(false)
const isMenuOpen = ref(false)
const searchQuery = ref('')

// Real notifications from database
const notifications = ref([])
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

// Fetch notifications from database
async function fetchNotifications() {
  if (!authStore.user?.id) return
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      notifications.value = data
    }
  } catch (err) {
    console.error('Error fetching notifications:', err)
  }
}

// Format relative date
function formatRelativeDate(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Mark notification as read
async function markAsRead(notif) {
  if (notif.is_read) return
  
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id)
    
    notif.is_read = true
  } catch (err) {
    console.error('Error marking as read:', err)
  }
}

// Go to notification page
function goToNotifications() {
  showNotifications.value = false
  router.push(`/${authStore.userRole}/notifications`)
}

// Group categories by type - HANYA MATA PELAJARAN POPULER
const groupedCategories = computed(() => {
  // Daftar kategori populer yang akan ditampilkan di navbar
  const popularAkademik = ['matematika', 'fisika', 'kimia', 'biologi', 'ipa', 'ips', 'ekonomi', 'geografi', 'sejarah', 'sosiologi']
  const popularBahasa = ['bahasa indonesia', 'bahasa inggris', 'bahasa mandarin', 'bahasa jepang', 'bahasa korea', 'bahasa arab']
  // Persiapan ujian untuk anak sekolah saja
  const popularUjian = ['utbk', 'sbmptn', 'olimpiade']
  // Mata Kuliah - kata kunci unik tanpa duplikat
  const popularKuliah = ['kalkulus', 'statistika', 'pemrograman', 'algoritma', 'basis data']
  // Track nama yang sudah ditambahkan untuk hindari duplikat
  const addedNames = new Set()
  
  const groups = {
    'Mata Pelajaran': [],
    'Bahasa': [],
    'Persiapan Ujian': [],
    'Mata Kuliah': []
  }
  
  categories.value.forEach(cat => {
    const name = cat.name.toLowerCase()
    
    // Skip jika sudah ada (hindari duplikat)
    if (addedNames.has(name)) return
    
    // Mata Pelajaran Sekolah (SD-SMA) - exclude mata kuliah universitas
    if (popularAkademik.some(p => name.includes(p)) && 
        !name.includes('umum') && !name.includes('dasar') && 
        !name.includes('mikro') && !name.includes('makro')) {
      groups['Mata Pelajaran'].push(cat)
      addedNames.add(name)
    }
    // Bahasa
    else if (popularBahasa.some(p => name.includes(p))) {
      groups['Bahasa'].push(cat)
      addedNames.add(name)
    }
    // Persiapan Ujian untuk anak sekolah (UTBK, Olimpiade)
    else if (popularUjian.some(p => name.includes(p))) {
      groups['Persiapan Ujian'].push(cat)
      addedNames.add(name)
    }
    // Mata Kuliah Universitas - hanya kata kunci spesifik
    else if (popularKuliah.some(p => name.includes(p)) && 
             !name.includes('keuangan') && !name.includes('biaya')) {
      groups['Mata Kuliah'].push(cat)
      addedNames.add(name)
    }
  })
  
  // Return only groups that have categories, limit each group to 5 items
  return Object.entries(groups)
    .filter(([, cats]) => cats.length > 0)
    .map(([name, cats]) => [name, cats.slice(0, 5)])
})

// Quick access categories (show first few from each group)
const quickCategories = computed(() => {
  const quick = []
  groupedCategories.value.forEach(([groupName]) => {
    quick.push({ name: groupName, isGroup: true })
  })
  return quick.slice(0, 6)
})

async function handleLogout() {
  await authStore.signOut()
  showProfileMenu.value = false
  router.push('/')
}

function getDisplayName() {
  if (authStore.userProfile?.name) return authStore.userProfile.name.split(' ')[0]
  if (authStore.user?.email) return authStore.user.email.split('@')[0]
  return 'User'
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  } else {
    router.push('/search')
  }
}

function goToCategory(category) {
  showCategories.value = false
  router.push({ path: '/search', query: { category: category.name.toLowerCase() } })
}

function goToGroupCategory(groupName) {
  showCategories.value = false
  router.push({ path: '/search', query: { category: groupName.toLowerCase() } })
}

onMounted(() => {
  fetchCategories()
  if (authStore.isAuthenticated) {
    fetchNotifications()
  }
})
</script>

<template>
  <!-- ========== NAVBAR LOGGED IN ========== -->
  <nav v-if="authStore.isAuthenticated" class="navbar navbar-logged">
    <div class="container">
      <div class="nav-content">
        <router-link to="/" class="logo"><span class="logo-text">Mariles</span></router-link>

        <!-- Category Button + Search Bar -->
        <div class="nav-search-section">
          <!-- Category Dropdown -->
          <div class="category-dropdown-wrapper" @mouseenter="showCategories = true" @mouseleave="showCategories = false">
            <button class="category-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Kategori</span>
              <svg class="chevron-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            <!-- Horizontal Dropdown with Groups -->
            <div v-show="showCategories" class="category-dropdown">
              <div v-for="([groupName, cats], index) in groupedCategories" :key="groupName" class="cat-group">
                <div class="cat-group-header" @click="goToGroupCategory(groupName)">{{ groupName }}</div>
                <div class="cat-group-items">
                  <div 
                    v-for="cat in cats.slice(0, 4)" 
                    :key="cat.id" 
                    class="cat-item"
                    @click="goToCategory(cat)"
                  >
                    {{ cat.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Search Bar -->
          <div class="nav-search">
            <svg class="search-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Cari tempat les..." @keyup.enter="handleSearch">
            <button class="search-btn" @click="handleSearch">
              Cari
            </button>
          </div>
        </div>

        <!-- Nav Menu -->
        <div class="nav-menu">
          <router-link :to="`/${authStore.userRole}/myclass`" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>MyClass</span>
          </router-link>

          <span class="nav-divider">|</span>

          <!-- Forum -->
          <router-link :to="`/${authStore.userRole}/forum`" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Forum</span>
          </router-link>

          <span class="nav-divider">|</span>

          <!-- Notifikasi dengan Dropdown -->
          <div class="nav-item-wrapper" 
               @mouseenter="showNotifications = true" 
               @mouseleave="showNotifications = false">
            <div class="nav-item notification-trigger" @click="goToNotifications">
              <span class="notif-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
              </span>
              <span>Notifikasi</span>
            </div>
            
            <!-- Dropdown -->
            <div v-show="showNotifications" class="notification-dropdown">
              <div class="dropdown-header">
                <span>Notifikasi</span>
                <router-link :to="`/${authStore.userRole}/notifications`" class="see-all">Lihat Semua</router-link>
              </div>
              <div class="dropdown-content">
                <div v-if="notifications.length === 0" class="empty-notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  <p>Belum ada notifikasi</p>
                </div>
                <div v-else class="notification-list">
                  <div 
                    v-for="notif in notifications" 
                    :key="notif.id" 
                    class="notification-item"
                    :class="{ unread: !notif.is_read }"
                    @click="markAsRead(notif)"
                  >
                    <div class="notif-dot" v-if="!notif.is_read"></div>
                    <div class="notif-body">
                      <p class="notif-title">{{ notif.title }}</p>
                      <p class="notif-message">{{ notif.message }}</p>
                      <span class="notif-time">{{ formatRelativeDate(notif.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span class="nav-divider">|</span>

          <!-- Profile -->
          <div class="nav-profile" @mouseenter="showProfileMenu = true" @mouseleave="showProfileMenu = false">
            <div class="profile-avatar">
              <img v-if="authStore.userProfile?.avatar_url" :src="authStore.userProfile.avatar_url" alt="">
              <span v-else>{{ authStore.userProfile?.name?.charAt(0) || authStore.user?.email?.charAt(0) || 'U' }}</span>
            </div>
            <span class="profile-name">{{ getDisplayName() }}</span>
            <svg class="chevron" :class="{ open: showProfileMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>

            <div v-if="showProfileMenu" class="profile-dropdown">
              <router-link :to="`/${authStore.userRole}/dashboard`" class="dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Dashboard
              </router-link>
              <router-link :to="`/${authStore.userRole}/profile`" class="dropdown-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profil Saya
              </router-link>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout" @click="handleLogout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Chat Widget (hidden on chat pages) -->
    <FloatingChatWidget v-if="!isChatPage" :user-role="authStore.userRole" />
  </nav>

  <!-- ========== NAVBAR GUEST ========== -->
  <nav v-else class="navbar navbar-guest">
    <div class="container">
      <div class="nav-content">
        <router-link to="/" class="logo"><span class="logo-text">Mariles</span></router-link>

        <!-- Category Button + Search Bar (same as logged in) -->
        <div class="nav-search-section">
          <!-- Category Dropdown -->
          <div class="category-dropdown-wrapper" @mouseenter="showCategories = true" @mouseleave="showCategories = false">
            <button class="category-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Kategori</span>
              <svg class="chevron-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            
            <!-- Horizontal Dropdown with Groups -->
            <div v-show="showCategories" class="category-dropdown">
              <div v-for="([groupName, cats], index) in groupedCategories" :key="groupName" class="cat-group">
                <div class="cat-group-header" @click="goToGroupCategory(groupName)">{{ groupName }}</div>
                <div class="cat-group-items">
                  <div 
                    v-for="cat in cats.slice(0, 4)" 
                    :key="cat.id" 
                    class="cat-item"
                    @click="goToCategory(cat)"
                  >
                    {{ cat.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Search Bar -->
          <div class="nav-search">
            <svg class="search-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Cari tempat les..." @keyup.enter="handleSearch">
            <button class="search-btn" @click="handleSearch">
              Cari
            </button>
          </div>
        </div>

        <!-- Auth Buttons -->
        <div class="nav-auth">
          <router-link to="/register" class="btn btn-auth-outline">Daftar</router-link>
          <router-link to="/login" class="btn btn-auth-primary">Masuk</router-link>
        </div>

        <button class="mobile-menu-btn" @click="isMenuOpen = !isMenuOpen"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* ========== NAVBAR GUEST ========== */
.navbar{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--primary);box-shadow:var(--shadow-md)}
.navbar-guest .nav-content{display:flex;align-items:center;gap:var(--spacing-lg);height:64px}
.nav-content{display:flex;align-items:center;justify-content:space-between;height:72px}
.logo{display:flex;align-items:center;gap:var(--spacing-sm);text-decoration:none}
.logo-text{font-size:var(--font-size-xl);font-weight:700;color:white;background:none;-webkit-text-fill-color:white}
.nav-links{display:flex;gap:var(--spacing-xl)}
.nav-link{font-weight:bold;color:rgba(255,255,255,0.9);transition:color var(--transition-fast)}
.nav-link:hover{color:white}
.nav-actions{display:flex;align-items:center;gap:var(--spacing-md)}
.nav-actions .btn-ghost{background:var(--secondary);color:white;border-color:rgba(255,255,255,0.3);}
.nav-actions .btn-ghost:hover{background:var(--secondary)}
.nav-actions .btn-primary{background:white;color:var(--primary)}
.nav-actions .btn-primary:hover{background:rgba(255,255,255,0.9)}
/* Guest Auth Buttons */
.nav-auth{display:flex;align-items:center;gap:var(--spacing-sm);flex-shrink:0}
.btn-auth-outline{padding:var(--spacing-sm) var(--spacing-lg);background:white;color:var(--text);border:2px solid white;border-radius:var(--radius-full);font-size:var(--font-size-sm);font-weight:600;transition:all var(--transition-fast);white-space:nowrap}
.btn-auth-outline:hover{background:rgba(255,255,255,0.9)}
.btn-auth-primary{padding:var(--spacing-sm) var(--spacing-lg);background:var(--secondary);color:white;border:2px solid var(--secondary);border-radius:var(--radius-full);font-size:var(--font-size-sm);font-weight:600;transition:all var(--transition-fast);white-space:nowrap}
.btn-auth-primary:hover{background:#0A4568;border-color:#0A4568}
.mobile-menu-btn{display:none;flex-direction:column;gap:5px;padding:8px;background:none;border:none;cursor:pointer}
.mobile-menu-btn span{width:24px;height:2px;background:white;border-radius:2px}
@media(max-width:768px){.nav-links{display:none;position:absolute;top:100%;left:0;right:0;background:var(--primary);flex-direction:column;padding:var(--spacing-lg);gap:var(--spacing-md);box-shadow:var(--shadow-lg)}.nav-links.active{display:flex}.mobile-menu-btn{display:flex}.nav-actions .btn:first-child{display:none}.nav-search-section{display:none}.nav-auth .btn-auth-outline{display:none}}

/* ========== NAVBAR LOGGED IN ========== */
.navbar-logged{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--primary);box-shadow:var(--shadow-md)}
.navbar-logged .nav-content{display:flex;align-items:center;gap:var(--spacing-lg);height:64px}
.navbar-logged .logo{flex-shrink:0}
.navbar-logged .logo-text{color:white;background:none;-webkit-text-fill-color:white}
/* Search Section with Category */
.nav-search-section{flex:1;display:flex;align-items:center;gap:var(--spacing-sm)}
.category-dropdown-wrapper{position:relative;padding-bottom:8px;margin-bottom:-8px}
.category-btn{display:flex;align-items:center;gap:6px;padding:var(--spacing-sm) var(--spacing-md);background:white;color:var(--text);border:none;border-radius:var(--radius-full);font-size:var(--font-size-sm);font-weight:500;cursor:pointer;transition:all var(--transition-fast);white-space:nowrap}
.category-btn svg{width:16px;height:16px}
.category-btn .chevron-small{width:14px;height:14px;transition:transform var(--transition-fast)}
.category-dropdown-wrapper:hover .chevron-small{transform:rotate(180deg)}
.category-dropdown{position:absolute;top:calc(100% + 4px);left:0;display:flex;gap:var(--spacing-md);background:white;padding:var(--spacing-md);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);z-index:200}
.cat-group{min-width:120px}
.cat-group-header{font-size:var(--font-size-xs);font-weight:600;color:var(--primary);padding:var(--spacing-xs) var(--spacing-sm);margin-bottom:var(--spacing-xs);cursor:pointer;border-radius:var(--radius-md);transition:all var(--transition-fast)}
.cat-group-header:hover{background:var(--primary);color:white}
.cat-group-items{display:flex;flex-direction:column;gap:2px}
.cat-item{padding:var(--spacing-xs) var(--spacing-sm);font-size:var(--font-size-xs);color:var(--text-secondary);border-radius:var(--radius-md);cursor:pointer;transition:all var(--transition-fast);white-space:nowrap}
.cat-item:hover{background:var(--background);color:var(--primary)}
.nav-search{flex:1;display:flex;align-items:center;gap:var(--spacing-sm);background:white;padding:var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-md);border-radius:var(--radius-full);border:none}
.nav-search:focus-within{box-shadow:0 0 0 3px rgba(255,255,255,0.3)}
.nav-search .search-icon-left{width:18px;height:18px;color:var(--text-muted);flex-shrink:0}
.nav-search input{flex:1;border:none;background:transparent;font-size:var(--font-size-sm);outline:none;color:var(--text);min-width:100px}
.nav-search input::placeholder{color:var(--text-muted)}
.search-btn{display:flex;align-items:center;justify-content:center;padding:8px 16px;background:var(--primary);border:none;border-radius:var(--radius-full);cursor:pointer;transition:all var(--transition-fast);flex-shrink:0;color:white;font-size:var(--font-size-sm);font-weight:600}
.search-btn:hover{background:var(--secondary);transform:scale(1.02)}
.nav-menu{display:flex;align-items:center;gap:var(--spacing-sm);margin-left:auto}
.nav-divider{color:rgba(255,255,255,0.4);font-weight:300}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--spacing-sm) var(--spacing-md);color:rgba(255,255,255,0.9);font-size:var(--font-size-xs);font-weight:700;border-radius:var(--radius-lg);transition:all var(--transition-fast);cursor:pointer}
.nav-item:hover{background:rgba(255,255,255,0.15);color:white}
.nav-item svg{width:20px;height:20px;stroke-width:2.5}
.nav-profile{position:relative;display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-xs);cursor:pointer;border-radius:var(--radius-lg)}
.nav-profile:hover{background:rgba(255,255,255,0.15)}
.profile-avatar{width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:600;overflow:hidden}
.profile-avatar img{width:100%;height:100%;object-fit:cover}
.profile-name{font-size:var(--font-size-sm);font-weight:700;color:white}
.chevron{width:16px;height:16px;color:rgba(255,255,255,0.7);transition:transform var(--transition-fast)}
.chevron.open{transform:rotate(180deg)}
.profile-dropdown{position:absolute;top:100%;right:0;width:200px;background:white;border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);border:1px solid var(--border-light);overflow:hidden;z-index:50;padding-top:8px;margin-top:0}
.profile-dropdown::before{content:'';position:absolute;top:-8px;left:0;right:0;height:8px;background:transparent}
.dropdown-item{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);color:var(--text);font-size:var(--font-size-sm);transition:background var(--transition-fast);width:100%;text-align:left;background:none;border:none;cursor:pointer}
.dropdown-item:hover{background:var(--background)}
.dropdown-item svg{width:18px;height:18px;color:var(--text-muted)}
.dropdown-item.logout{color:var(--error)}
.dropdown-item.logout svg{color:var(--error)}
.dropdown-divider{height:1px;background:var(--border-light)}

/* Notification Wrapper & Dropdown */
.nav-item-wrapper{position:relative}
.notification-trigger{position:relative}
.notif-icon-wrap{position:relative;display:inline-flex}
.notification-badge{position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;background:#EF4444;color:white;font-size:9px;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--primary)}
.notification-dropdown{position:absolute;top:100%;right:-50%;width:340px;background:white;border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);overflow:hidden;z-index:100;margin-top:8px;animation:dropdownIn 0.2s ease}
@keyframes dropdownIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.notification-dropdown::before{content:'';position:absolute;top:-8px;left:0;right:0;height:8px;background:transparent}
.dropdown-header{display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) var(--spacing-lg);border-bottom:1px solid var(--border-light);font-weight:600;color:var(--text);font-size:var(--font-size-sm)}
.dropdown-header .see-all{font-size:12px;color:var(--primary);font-weight:500}
.dropdown-content{max-height:320px;overflow-y:auto}
.empty-notifications{padding:var(--spacing-xl);text-align:center;color:var(--text-muted)}
.empty-notifications svg{width:48px;height:48px;margin-bottom:var(--spacing-md);opacity:0.5}
.empty-notifications p{font-size:var(--font-size-sm)}
.notification-list{padding:8px}
.notification-item{display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:10px;transition:background var(--transition-fast);cursor:pointer}
.notification-item:hover{background:#F1F5F9}
.notification-item.unread{background:#F0F9FF}
.notif-dot{width:8px;height:8px;background:#3B82F6;border-radius:50%;margin-top:6px;flex-shrink:0}
.notif-body{flex:1;min-width:0}
.notif-title{font-size:13px;font-weight:600;color:#1E293B;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.notif-message{font-size:12px;color:#64748B;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.notif-time{font-size:11px;color:#94A3B8;margin-top:4px;display:block}

/* Floating Chat Button */
.floating-chat-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:var(--radius-full);background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 25px rgba(13,87,130,0.35);transition:all var(--transition-base);z-index:1000;overflow:hidden}
.floating-chat-btn svg{width:28px;height:28px;transition:all var(--transition-base)}
.floating-chat-btn .btn-label{position:absolute;opacity:0;transform:translateX(10px);font-size:var(--font-size-sm);font-weight:600;white-space:nowrap;transition:all var(--transition-base)}
.floating-chat-btn:hover{width:120px;border-radius:var(--radius-xl);transform:translateY(-4px);box-shadow:0 12px 35px rgba(13,87,130,0.45)}
.floating-chat-btn:hover svg{transform:translateX(-16px)}
.floating-chat-btn:hover .btn-label{opacity:1;transform:translateX(12px)}
.floating-chat-btn::before{content:'';position:absolute;inset:0;border-radius:inherit;background:inherit;animation:pulse-ring 2s infinite;z-index:-1}
@keyframes pulse-ring{0%{transform:scale(1);opacity:0.5}50%{transform:scale(1.15);opacity:0}100%{transform:scale(1);opacity:0}}

@media(max-width:768px){.nav-search{display:none}.nav-item span{display:none}.nav-item{padding:var(--spacing-sm)}.floating-chat-btn{bottom:16px;right:16px;width:56px;height:56px}.floating-chat-btn:hover{width:56px;border-radius:var(--radius-full)}.floating-chat-btn:hover svg{transform:none}.floating-chat-btn:hover .btn-label{opacity:0}}
</style>
