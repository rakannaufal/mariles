<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStudentData } from '@/composables/useStudentData'
import { useChat } from '@/composables/useChat'

const router = useRouter()
const authStore = useAuthStore()
const { loading, bookings, favorites, stats, fetchAllData } = useStudentData()
const { getAvailableChatPartners, getOrCreateChatRoom } = useChat()

// Teachers data
const teachers = ref([])
const teachersLoading = ref(false)
const chatLoading = ref(null) // Store which teacher is being loaded

onMounted(async () => {
  fetchAllData()
  await fetchTeachers()
})

async function fetchTeachers() {
  if (!authStore.user?.id) return
  teachersLoading.value = true
  try {
    const partners = await getAvailableChatPartners(authStore.user.id)
    teachers.value = partners.teachers || []
  } catch (err) {
    console.error('Error fetching teachers:', err)
  } finally {
    teachersLoading.value = false
  }
}

async function startChatWithTeacher(teacher) {
  if (!authStore.user?.id) return
  chatLoading.value = teacher.id
  try {
    const room = await getOrCreateChatRoom(authStore.user.id, teacher.id, teacher.lesPlaceId)
    router.push({ name: 'student-chat', query: { room: room.id } })
  } catch (err) {
    console.error('Error starting chat:', err)
    alert('Gagal memulai chat')
  } finally {
    chatLoading.value = null
  }
}

const recentBookings = computed(() => bookings.value.slice(0, 3))

function getStatusClass(status) {
  const classes = { active: 'success', confirmed: 'success', pending: 'warning', completed: 'info', cancelled: 'error' }
  return classes[status] || ''
}

function getStatusText(status) {
  const texts = { active: 'Aktif', confirmed: 'Aktif', pending: 'Menunggu', completed: 'Selesai', cancelled: 'Dibatalkan' }
  return texts[status] || status
}
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <div>
          <h1>Dashboard</h1>
          <p>Selamat datang, {{ authStore.userProfile?.name || 'Siswa' }}</p>
        </div>
        <router-link to="/search" class="btn-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Cari Tempat Les
        </router-link>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div>
            <h3>{{ stats.active_classes }}</h3>
            <p>Kelas Aktif</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <h3>{{ stats.pending_bookings }}</h3>
            <p>Menunggu</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <h3>{{ stats.completed_classes }}</h3>
            <p>Selesai</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div>
            <h3>{{ stats.favorites_count }}</h3>
            <p>Favorit</p>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <template v-else>
        <div class="content-grid">
          <!-- Recent Bookings -->
          <section class="card">
            <div class="card-header">
              <h2>Booking Terbaru</h2>
              <router-link to="/student/bookings" class="link">Lihat Semua</router-link>
            </div>

            <div v-if="recentBookings.length" class="booking-list">
              <div v-for="booking in recentBookings" :key="booking.id" class="booking-item">
                <img :src="booking.program?.les_place?.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=100'" :alt="booking.program?.les_place?.name">
                <div class="booking-info">
                  <h4>{{ booking.program?.name }}</h4>
                  <p>{{ booking.program?.les_place?.name }}</p>
                </div>
                <span class="badge" :class="getStatusClass(booking.status)">{{ getStatusText(booking.status) }}</span>
              </div>
            </div>

            <div v-else class="empty-state">
              <p>Belum ada booking</p>
              <router-link to="/search" class="btn btn-primary btn-sm">Cari Tempat Les</router-link>
            </div>
          </section>

          <!-- Quick Actions -->
          <section class="card">
            <h2>Aksi Cepat</h2>
            <div class="actions-grid">
              <router-link to="/search" class="action-card">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <span>Cari Les</span>
              </router-link>
              <router-link to="/student/myclass" class="action-card">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <span>Kelas</span>
              </router-link>
              <router-link to="/student/bookings" class="action-card">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span>Booking</span>
              </router-link>
              <router-link to="/student/profile" class="action-card">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span>Profil</span>
              </router-link>
            </div>
          </section>
        </div>

        <!-- Guru Pengajar Section -->
        <section v-if="teachers.length || teachersLoading" class="card teachers-section">
          <div class="card-header">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="section-icon">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Guru Pengajar Anda
            </h2>
            <router-link to="/student/chat" class="link">Lihat Chat</router-link>
          </div>
          
          <div v-if="teachersLoading" class="teachers-loading">
            <div class="loading-spinner small"></div>
            <span>Memuat data guru...</span>
          </div>
          
          <div v-else-if="teachers.length" class="teachers-grid">
            <div v-for="teacher in teachers" :key="teacher.id" class="teacher-card">
              <div class="teacher-avatar">
                <img v-if="teacher.avatar_url" :src="teacher.avatar_url" :alt="teacher.name">
                <span v-else class="avatar-placeholder">{{ teacher.name?.charAt(0)?.toUpperCase() }}</span>
              </div>
              <div class="teacher-info">
                <h4>{{ teacher.name }}</h4>
                <p class="teacher-place">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {{ teacher.lesPlaceName || 'Tempat Les' }}
                </p>
                <div v-if="teacher.specialization?.length" class="teacher-specialization">
                  <span v-for="spec in teacher.specialization.slice(0, 2)" :key="spec" class="spec-tag">
                    {{ spec }}
                  </span>
                  <span v-if="teacher.specialization.length > 2" class="spec-more">
                    +{{ teacher.specialization.length - 2 }}
                  </span>
                </div>
              </div>
              <button 
                class="chat-teacher-btn" 
                @click="startChatWithTeacher(teacher)"
                :disabled="chatLoading === teacher.id"
              >
                <svg v-if="chatLoading !== teacher.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span v-if="chatLoading === teacher.id" class="loading-spinner tiny"></span>
                <span v-else>Chat</span>
              </button>
            </div>
          </div>
          
          <div v-else class="empty-teachers">
            <p>Belum ada guru yang terhubung. Daftar kelas terlebih dahulu untuk melihat guru pengajar.</p>
          </div>
        </section>

        <!-- Favorites -->
        <section v-if="favorites.length" class="card favorites-section">
          <div class="card-header">
            <h2>Favorit Saya</h2>
            <router-link to="/student/favorites" class="link">Lihat Semua</router-link>
          </div>
          <div class="favorites-grid">
            <router-link v-for="fav in favorites.slice(0, 4)" :key="fav.id" :to="`/les/${fav.les_place_id}`" class="favorite-card">
              <img :src="fav.les_place?.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="fav.les_place?.name">
              <div class="favorite-info">
                <h4>{{ fav.les_place?.name }}</h4>
                <p>{{ fav.les_place?.city }}</p>
              </div>
            </router-link>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:24px;max-width:1200px}

.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.header h1{font-size:24px;font-weight:700;margin-bottom:4px}
.header p{color:var(--text-secondary);font-size:14px}
.btn-cta{display:flex;align-items:center;gap:8px;padding:12px 20px;background:var(--secondary);color:white;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;transition:all 0.2s}
.btn-cta:hover{background:var(--primary);transform:translateY(-2px)}
.btn-cta svg{width:18px;height:18px}

.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{background:white;padding:20px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);display:flex;align-items:center;gap:16px}
.stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.stat-icon svg{width:24px;height:24px}
.stat-icon.active{background:rgba(34,197,94,0.1);color:#22c55e}
.stat-icon.pending{background:rgba(245,158,11,0.1);color:#f59e0b}
.stat-icon.completed{background:rgba(59,130,246,0.1);color:#3b82f6}
.stat-icon.favorites{background:rgba(239,68,68,0.1);color:#ef4444}
.stat-card h3{font-size:24px;font-weight:700;color:var(--text)}
.stat-card p{color:var(--text-secondary);font-size:13px;margin-top:2px}

.loading-state{display:flex;justify-content:center;padding:60px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.content-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;margin-bottom:24px}
.card{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.card h2{font-size:18px;font-weight:600}
.link{font-size:13px;color:var(--primary);text-decoration:none;font-weight:500}
.link:hover{text-decoration:underline}

.booking-list{display:flex;flex-direction:column;gap:12px}
.booking-item{display:flex;align-items:center;gap:14px;padding:12px;background:var(--background);border-radius:10px}
.booking-item img{width:56px;height:56px;border-radius:8px;object-fit:cover}
.booking-info{flex:1;min-width:0}
.booking-info h4{font-size:14px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.booking-info p{font-size:12px;color:var(--text-secondary)}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.badge.success{background:rgba(34,197,94,0.1);color:#22c55e}
.badge.warning{background:rgba(245,158,11,0.1);color:#f59e0b}
.badge.info{background:rgba(59,130,246,0.1);color:#3b82f6}

.actions-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.action-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px;background:var(--background);border-radius:12px;text-decoration:none;color:var(--text);font-size:13px;font-weight:500;transition:all 0.2s}
.action-card:hover{background:var(--secondary);color:white}
.action-card:hover .action-icon{color:white}
.action-icon{width:32px;height:32px;color:var(--secondary)}
.action-icon svg{width:100%;height:100%}

.favorites-section{margin-bottom:24px}
.favorites-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.favorite-card{background:var(--background);border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;transition:all 0.2s}
.favorite-card:hover{transform:translateY(-4px);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.favorite-card img{width:100%;aspect-ratio:16/10;object-fit:cover}
.favorite-info{padding:12px}
.favorite-info h4{font-size:14px;font-weight:600;margin-bottom:2px}
.favorite-info p{font-size:12px;color:var(--text-secondary)}

/* Teachers Section */
.teachers-section{margin-bottom:24px}
.teachers-section .card-header h2{display:flex;align-items:center;gap:10px}
.section-icon{width:22px;height:22px;color:var(--secondary)}
.teachers-loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:40px;color:var(--text-secondary)}
.loading-spinner.small{width:24px;height:24px;border-width:2px}
.loading-spinner.tiny{width:16px;height:16px;border-width:2px}

.teachers-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px}
.teacher-card{display:flex;align-items:center;gap:16px;padding:16px;background:var(--background);border-radius:14px;transition:all 0.2s;border:2px solid transparent}
.teacher-card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}

.teacher-avatar{width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg, var(--secondary), var(--primary))}
.teacher-avatar img{width:100%;height:100%;object-fit:cover}
.avatar-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:600}

.teacher-info{flex:1;min-width:0}
.teacher-info h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.teacher-place{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-secondary);margin-bottom:8px}
.teacher-place svg{width:12px;height:12px}

.teacher-specialization{display:flex;flex-wrap:wrap;gap:4px}
.spec-tag{padding:3px 8px;background:rgba(13, 87, 130, 0.1);color:var(--secondary);font-size:10px;font-weight:600;border-radius:12px;white-space:nowrap}
.spec-more{padding:3px 8px;background:var(--border-light);color:var(--text-muted);font-size:10px;font-weight:500;border-radius:12px}

.chat-teacher-btn{display:flex;align-items:center;gap:6px;padding:10px 16px;background:#0d5782;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap}
.chat-teacher-btn:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(13, 87, 130, 0.3)}
.chat-teacher-btn:disabled{opacity:0.7;cursor:not-allowed;transform:none}
.chat-teacher-btn svg{width:16px;height:16px}

.empty-teachers{text-align:center;padding:32px;color:var(--text-muted);font-size:14px}

.empty-state{text-align:center;padding:32px;color:var(--text-muted)}

@media(max-width:1024px){.stats-grid{grid-template-columns:repeat(2,1fr)}.content-grid{grid-template-columns:1fr}.favorites-grid{grid-template-columns:repeat(2,1fr)}.teachers-grid{grid-template-columns:1fr}}
@media(max-width:768px){.header{flex-direction:column;text-align:center;gap:16px}.stats-grid{grid-template-columns:1fr 1fr}.favorites-grid{grid-template-columns:1fr}.teacher-card{flex-wrap:wrap}.chat-teacher-btn{width:100%;justify-content:center;margin-top:8px}}
</style>
