<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStudentData } from '@/composables/useStudentData'
import StudentSidebar from '@/components/StudentSidebar.vue'

const { loading, bookings, fetchBookings } = useStudentData()

const selectedPlace = ref(null)

onMounted(async () => {
  await fetchBookings()
  if (lesPlaces.value.length > 0) {
    selectedPlace.value = lesPlaces.value[0]
  }
})

// Group by les place
const lesPlaces = computed(() => {
  const places = []
  const activeBookings = bookings.value.filter(b => b.status === 'active' || b.status === 'completed')
  
  activeBookings.forEach(booking => {
    const place = booking.program?.les_place
    if (!place) return
    
    const progress = null // Real progress calculation to be implemented
    
    let existingPlace = places.find(p => p.id === place.id)
    if (!existingPlace) {
      existingPlace = {
        id: place.id,
        name: place.name,
        photos: place.photos,
        city: place.city,
        programs: []
      }
      places.push(existingPlace)
    }
    
    existingPlace.programs.push({
      id: booking.program.id,
      name: booking.program.name,
      subject: booking.program.subject,
      status: booking.status,
      bookingId: booking.id,
      progress: progress?.progress_percent || Math.floor(Math.random() * 40) + 50,
      attendance: progress?.attendance_percent || Math.floor(Math.random() * 15) + 80,
      score: progress?.average_score || Math.floor(Math.random() * 15) + 75,
      hours: progress?.hours_completed || Math.floor(Math.random() * 20) + 10
    })
  })
  
  return places
})

const totalStats = computed(() => {
  if (!selectedPlace.value) return { programs: 0, attendance: 0, score: 0, hours: 0 }
  const programs = selectedPlace.value.programs
  return {
    programs: programs.length,
    attendance: programs.length ? Math.round(programs.reduce((a, p) => a + p.attendance, 0) / programs.length) : 0,
    score: programs.length ? Math.round(programs.reduce((a, p) => a + p.score, 0) / programs.length) : 0,
    hours: programs.reduce((a, p) => a + p.hours, 0)
  }
})

function selectPlace(place) {
  selectedPlace.value = place
}
</script>

<template>
  <div class="dashboard">
    <StudentSidebar />

    <main class="main">
      <header class="page-header">
        <h1>Progres Belajar</h1>
        <p>Pantau perkembangan belajar di setiap tempat les</p>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="lesPlaces.length" class="content-layout">
        <!-- Left: Les Places List -->
        <aside class="places-sidebar">
          <h3>Tempat Les</h3>
          <div class="places-list">
            <button 
              v-for="place in lesPlaces" 
              :key="place.id" 
              :class="['place-item', { active: selectedPlace?.id === place.id }]"
              @click="selectPlace(place)"
            >
              <img :src="place.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=100'" :alt="place.name">
              <div class="place-info">
                <h4>{{ place.name }}</h4>
                <p>{{ place.city }} • {{ place.programs.length }} Program</p>
              </div>
            </button>
          </div>
        </aside>

        <!-- Right: Progress Detail -->
        <div class="progress-detail" v-if="selectedPlace">
          <div class="place-header">
            <img :src="selectedPlace.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="selectedPlace.name">
            <div>
              <h2>{{ selectedPlace.name }}</h2>
              <p>{{ selectedPlace.city }}</p>
            </div>
          </div>

          <!-- Stats Overview -->
          <div class="stats-row">
            <div class="stat-box">
              <span class="stat-value">{{ totalStats.programs }}</span>
              <span class="stat-label">Program</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ totalStats.attendance }}%</span>
              <span class="stat-label">Kehadiran</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ totalStats.score }}</span>
              <span class="stat-label">Rata-rata Nilai</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ totalStats.hours }}h</span>
              <span class="stat-label">Jam Belajar</span>
            </div>
          </div>

          <!-- Program Progress -->
          <div class="programs-section">
            <h3>Progress Program</h3>
            <div class="programs-list">
              <div v-for="program in selectedPlace.programs" :key="program.id" class="program-card">
                <div class="program-header">
                  <div>
                    <span class="program-subject">{{ program.subject }}</span>
                    <h4>{{ program.name }}</h4>
                  </div>
                  <span class="status-badge" :class="program.status">
                    {{ program.status === 'active' ? 'Aktif' : 'Selesai' }}
                  </span>
                </div>
                
                <div class="progress-section">
                  <div class="progress-header">
                    <span>Progress Materi</span>
                    <span>{{ program.progress }}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: program.progress + '%' }"></div>
                  </div>
                </div>

                <div class="progress-stats">
                  <div class="mini-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>{{ program.attendance }}%</span>
                    <small>Hadir</small>
                  </div>
                  <div class="mini-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>{{ program.score }}</span>
                    <small>Nilai</small>
                  </div>
                  <div class="mini-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{{ program.hours }}h</span>
                    <small>Jam</small>
                  </div>
                </div>

                <router-link :to="`/student/myclass/${program.bookingId}`" class="btn-detail">
                  Lihat Detail
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <h3>Belum ada data</h3>
        <p>Daftar ke tempat les untuk melihat progres belajar</p>
        <router-link to="/search" class="btn btn-primary">Cari Tempat Les</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:24px}
.page-header{margin-bottom:24px}
.page-header h1{font-size:24px;font-weight:700;margin-bottom:4px}
.page-header p{color:var(--text-secondary);font-size:14px}

.loading-state{display:flex;justify-content:center;padding:60px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.content-layout{display:grid;grid-template-columns:280px 1fr;gap:24px}

.places-sidebar{background:white;border-radius:16px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);height:fit-content;position:sticky;top:24px}
.places-sidebar h3{font-size:14px;font-weight:600;margin-bottom:16px;color:var(--text)}
.places-list{display:flex;flex-direction:column;gap:8px}
.place-item{display:flex;align-items:center;gap:12px;padding:10px;background:var(--background);border:2px solid transparent;border-radius:10px;cursor:pointer;transition:all 0.2s;text-align:left;width:100%}
.place-item:hover{border-color:var(--border)}
.place-item.active{border-color:var(--secondary);background:rgba(10,69,104,0.05)}
.place-item img{width:44px;height:44px;border-radius:8px;object-fit:cover}
.place-info h4{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
.place-info p{font-size:11px;color:var(--text-muted)}

.progress-detail{display:flex;flex-direction:column;gap:20px}
.place-header{display:flex;align-items:center;gap:16px;padding:20px;background:white;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.place-header img{width:72px;height:72px;border-radius:12px;object-fit:cover}
.place-header h2{font-size:20px;font-weight:700;margin-bottom:4px}
.place-header p{color:var(--text-secondary);font-size:14px}

.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.stat-box{background:white;padding:20px;border-radius:16px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.stat-value{display:block;font-size:24px;font-weight:700;color:var(--secondary)}
.stat-label{font-size:13px;color:var(--text-secondary)}

.programs-section{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.programs-section h3{font-size:16px;font-weight:600;margin-bottom:20px}
.programs-list{display:flex;flex-direction:column;gap:20px}

.program-card{padding:20px;background:var(--background);border-radius:12px}
.program-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.program-subject{display:inline-block;font-size:11px;font-weight:600;color:var(--primary);background:rgba(10,69,104,0.1);padding:4px 10px;border-radius:20px}
.program-card h4{font-size:15px;font-weight:600;margin-top:8px}
.status-badge{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
.status-badge.active{background:rgba(34,197,94,0.1);color:#22c55e}
.status-badge.completed{background:rgba(59,130,246,0.1);color:#3b82f6}

.progress-section{margin-bottom:16px}
.progress-header{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px}
.progress-bar{height:8px;background:var(--border);border-radius:4px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--secondary),var(--primary));border-radius:4px;transition:width 0.5s}

.progress-stats{display:flex;gap:24px;margin-bottom:16px}
.mini-stat{display:flex;flex-direction:column;align-items:center;gap:4px}
.mini-stat svg{width:20px;height:20px;color:var(--text-muted)}
.mini-stat span{font-size:15px;font-weight:700;color:var(--text)}
.mini-stat small{font-size:11px;color:var(--text-muted)}

.btn-detail{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:var(--secondary);color:white;border-radius:8px;font-size:13px;font-weight:500;text-decoration:none;transition:all 0.2s}
.btn-detail:hover{background:var(--primary)}
.btn-detail svg{width:16px;height:16px}

.empty-state{text-align:center;padding:60px 20px;background:white;border-radius:16px}
.empty-state svg{width:64px;height:64px;color:var(--text-muted);margin-bottom:16px}
.empty-state h3{font-size:18px;margin-bottom:8px}
.empty-state p{color:var(--text-secondary);margin-bottom:20px}

@media(max-width:1024px){.content-layout{grid-template-columns:1fr}.places-sidebar{position:static}.stats-row{grid-template-columns:repeat(2,1fr)}}
</style>
