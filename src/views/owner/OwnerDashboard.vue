<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import RevenueChart from '@/components/charts/RevenueChart.vue'
import StudentTrendChart from '@/components/charts/StudentTrendChart.vue'
import ProgramDistributionChart from '@/components/charts/ProgramDistributionChart.vue'
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const loading = ref(true)

// Stats
const stats = ref({
  totalLes: { value: 0, trend: '-', trendUp: true },
  totalStudents: { value: 0, trend: '-', trendUp: true },
  activeClasses: { value: 0, trend: '-', trendUp: true },
  totalRevenue: { value: 0, trend: '-', trendUp: true },
  averageRating: { value: 0, trend: '-', trendUp: true }
})

// Charts Data
const revenueData = ref([])
const studentTrendData = ref([])
const programDistData = ref([])

// Recent Activity
const recentRegistrations = ref([])

const lesPlace = ref({ is_private: false })
const teacherStats = ref({})
const todaySchedule = ref([])

onMounted(async () => {
  await fetchDashboardData()
})

async function fetchDashboardData() {
  loading.value = true
  try {
    if (!authStore.user?.id) return
    
    // Get Owner ID
    const { data: owner } = await supabase.from('owners').select('id, business_name').eq('user_id', authStore.user.id).single()
    if (!owner) return

    // Fetch les place to check is_private
    const { data: lpData } = await supabase
      .from('les_places')
      .select('id, name, is_private')
      .eq('owner_id', owner.id)
      .single()
    
    if (lpData) {
      lesPlace.value = lpData
    }

    if (lesPlace.value.is_private) {
        // Private/Teacher view logic (schedule to be implemented)
        todaySchedule.value = []
    } else {
        // 1. Fetch Key Metrics
        // Count Places
        const { count: lesCount } = await supabase.from('les_places').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id)
        
        // Revenue & Students
        stats.value.totalLes.value = lesCount || 0
        
        // Calculate total students from PAID bookings for this les_place's programs
        // First get program IDs for this les_place
        const { data: ownerProgramsData } = await supabase
          .from('programs')
          .select('id')
          .eq('les_place_id', lpData?.id)
        
        const ownerProgramIds = ownerProgramsData?.map(p => p.id) || []
        
        let studentCount = 0
        if (ownerProgramIds.length > 0) {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .in('program_id', ownerProgramIds)
            .in('status', ['active', 'confirmed'])
            .in('payment_status', ['paid', 'settlement', 'capture'])
          
          studentCount = count || 0
        }
        
        stats.value.totalStudents.value = studentCount 

        // Calculate total revenue from COMPLETED transactions
        const { data: txnData } = await supabase
          .from('transactions')
          .select('net_amount, amount, payment_status')
          .eq('les_place_id', lpData?.id)
          .in('payment_status', ['completed', 'paid', 'settlement', 'capture'])
        
        let totalRevenue = (txnData || []).reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0)

        // Fallback: If no transactions, calculate from paid bookings
        if (totalRevenue === 0) {
          const { data: paidBookings } = await supabase
            .from('bookings')
            .select('programs(price)')
            .in('payment_status', ['paid', 'settlement', 'capture'])
          
          totalRevenue = (paidBookings || []).reduce((sum, b) => sum + (b.programs?.price || 0), 0)
        }

        stats.value.totalRevenue.value = totalRevenue

        // 2. Fetch Charts Data (Implemented as empty for now until backend analytics are ready)
        revenueData.value = []
        studentTrendData.value = []
        programDistData.value = []
        
        // Reset trends
        stats.value.totalRevenue.trend = totalRevenue > 0 ? '+' + new Intl.NumberFormat('id-ID').format(totalRevenue) : '-'
        stats.value.totalStudents.trend = studentCount > 0 ? '+' + studentCount + ' siswa' : '-'
        stats.value.averageRating.value = 0
        stats.value.averageRating.trend = '-'

        // 3. Recent Registrations
        const { data: registrations } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at,
            students(users(name, email, phone)),
            programs(name, price)
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        recentRegistrations.value = registrations || []
    }

  } catch (err) {
    console.error('Error fetching dashboard:', err)
  } finally {
    loading.value = false
  }
}


function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getStatusClass(status) {
  const classes = { pending: 'warning', active: 'success', completed: 'info', cancelled: 'error' }
  return classes[status] || ''
}
function getStatusText(status) {
    const texts = { pending:'Menunggu', active:'Aktif', completed:'Selesai', cancelled:'Batal' }
    return texts[status] || status
}
</script>

<template>
  <div class="dashboard-layout">
    <OwnerSidebar />

    <main class="main-content">
      <header class="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Selamat datang kembali, {{ authStore.userProfile?.name }} 👋</p>
        </div>
        <div class="actions">
            <!-- Add action buttons if needed -->
        </div>
      </header>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="dashboard-grid">
        <!-- 1. Summary Cards Row -->
        <section class="summary-cards">
            <div class="card stat-card">
                <div class="icon-wrapper blue">
                    <span style="font-weight: 700; font-size: 1.2rem;">Rp.</span>
                </div>
                <div class="stat-content">
                    <span class="label">Total Pendapatan</span>
                    <h3 class="value">Rp {{ new Intl.NumberFormat('id-ID').format(stats.totalRevenue.value) }}</h3>
                    <span class="trend" :class="stats.totalRevenue.trendUp ? 'up' : 'down'">
                        {{ stats.totalRevenue.trend }} <span class="muted" v-if="stats.totalRevenue.trend !== '-'">bulan ini</span>
                    </span>
                </div>
            </div>

            <div class="card stat-card">
               <div class="icon-wrapper green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               </div>
               <div class="stat-content">
                   <span class="label">Siswa Aktif</span>
                   <h3 class="value">{{ stats.totalStudents.value }}</h3>
                    <span class="trend" :class="stats.totalStudents.trendUp ? 'up' : 'down'">
                        {{ stats.totalStudents.trend }} <span class="muted" v-if="stats.totalStudents.trend !== '-'">minggu ini</span>
                    </span>
               </div>
           </div>

           <div class="card stat-card">
               <div class="icon-wrapper purple">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
               </div>
               <div class="stat-content">
                   <span class="label">Total Tempat Les</span>
                   <h3 class="value">{{ stats.totalLes.value }}</h3>
                   <span class="trend neutral">
                        Stabil
                    </span>
               </div>
           </div>
           
           <div class="card stat-card">
               <div class="icon-wrapper orange">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
               </div>
               <div class="stat-content">
                   <span class="label">Rating Rata-rata</span>
                   <h3 class="value">{{ stats.averageRating.value }}</h3>
                   <span class="trend up">
                        {{ stats.averageRating.trend }} <span class="muted" v-if="stats.averageRating.trend !== '-'">dari kemarin</span>
                    </span>
               </div>
           </div>
        </section>

        <!-- 2. Charts Section -->
        <section class="charts-overview">
            <!-- Revenue Main Chart -->
            <div class="card revenue-chart-card">
                <div class="card-header">
                    <h3>Statistik Pendapatan</h3>
                    <select class="chart-filter">
                        <option>6 Bulan Terakhir</option>
                        <option>Tahun Ini</option>
                    </select>
                </div>
                <RevenueChart :data="revenueData" :height="320" />
            </div>

            <!-- Side Charts Column -->
            <div class="side-charts">
                <div class="card distribution-card">
                    <h3>Program Populer</h3>
                    <ProgramDistributionChart :data="programDistData" :height="250" />
                </div>
                <div class="card trend-card">
                    <h3>Siswa Baru (Mingguan)</h3>
                    <StudentTrendChart :data="studentTrendData" :height="200" />
                </div>
            </div>
        </section>

        <!-- 3. Recent Transactions / Registrations -->
        <section class="recent-section">
            <div class="card table-card">
                <div class="card-header">
                    <h3>Pendaftaran Terbaru</h3>
                    <router-link to="/owner/registrations" class="link">Lihat Semua</router-link>
                </div>
                <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Siswa</th>
                                <th>Program</th>
                                <th>Tanggal</th>
                                <th>Biaya</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="reg in recentRegistrations" :key="reg.id">
                                <td>
                                    <div class="user-cell">
                                        <div class="avatar-placeholder">{{ reg.students?.users?.name?.charAt(0) || 'U' }}</div>
                                        <div>
                                            <div class="fw-bold">{{ reg.students?.users?.name || 'N/A' }}</div>
                                            <div class="text-xs text-muted">{{ reg.students?.users?.phone || '-' }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{{ reg.programs?.name }}</td>
                                <td>{{ formatDate(reg.created_at) }}</td>
                                <td class="fw-medium">Rp {{ new Intl.NumberFormat('id-ID').format(reg.programs?.price || 0) }}</td>
                                <td>
                                    <span class="status-badge" :class="getStatusClass(reg.status)">
                                        {{ getStatusText(reg.status) }}
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="recentRegistrations.length === 0">
                                <td colspan="5" class="text-center py-lg text-muted">Belum ada data pendaftaran</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Page Layout */
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background-color: #F8FAFC;
  font-family: 'Poppins', sans-serif;
}

.main-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 4px;
}

.page-header p {
  color: #64748B;
}

/* Grid System */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E2E8F0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-wrapper.blue { background: #E0F2FE; color: #0284C7; }
.icon-wrapper.green { background: #DCFCE7; color: #16A34A; }
.icon-wrapper.purple { background: #F3E8FF; color: #9333EA; }
.icon-wrapper.orange { background: #FFEDD5; color: #EA580C; }

.stat-content {
  flex: 1;
}

.stat-content .label {
  display: block;
  font-size: 13px;
  color: #64748B;
  margin-bottom: 4px;
}

.stat-content .value {
  font-size: 20px;
  font-weight: 700;
  color: #0F172A;
  margin-bottom: 4px;
}

.stat-content .trend {
  font-size: 12px;
  font-weight: 500;
}
.trend.up { color: #16A34A; }
.trend.down { color: #DC2626; }
.trend.neutral { color: #64748B; }
.trend .muted { color: #94A3B8; font-weight: 400; }

/* Charts Overview */
.charts-overview {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1E293B;
}

.link {
  font-size: 13px;
  color: #0284C7;
  font-weight: 500;
  text-decoration: none;
}

.chart-filter {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
  font-size: 12px;
  color: #475569;
  background: #F8FAFC;
}

.side-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Table Section */
.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  padding: 12px 16px;
  border-bottom: 1px solid #E2E8F0;
}

.modern-table td {
  padding: 16px;
  font-size: 14px;
  color: #334155;
  border-bottom: 1px solid #F1F5F9;
}

.modern-table tr:last-child td {
  border-bottom: none;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  background: #E0F2FE;
  color: #0284C7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.text-xs { font-size: 12px; }
.fw-bold { font-weight: 600; }
.fw-medium { font-weight: 500; }
.text-muted { color: #64748B; }

.status-badge {
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge.success { background: #DCFCE7; color: #16A34A; }
.status-badge.warning { background: #FEF3C7; color: #D97706; }
.status-badge.error { background: #FEE2E2; color: #DC2626; }
.status-badge.info { background: #DBEAFE; color: #2563EB; }

/* Responsive */
@media (max-width: 1200px) {
  .charts-overview {
    grid-template-columns: 1fr;
  }
  .side-charts {
    flex-direction: row;
  }
}

@media (max-width: 900px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .side-charts {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  .main-content {
    padding: 16px;
  }
}

/* Utils */
.spinner {
  width: 40px; height: 40px;
  border: 3px solid #E2E8F0;
  border-top-color: #0284C7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 40px auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
