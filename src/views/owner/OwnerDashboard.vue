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
        // Count Programs (Active)
        const { count: programCount } = await supabase
            .from('programs')
            .select('*', { count: 'exact', head: true })
            .eq('les_place_id', lpData?.id)
            .eq('is_active', true)
        
        // Revenue & Students
        stats.value.totalPrograms = { value: programCount || 0, trend: 'Aktif' }
        
        // Calculate total students from PAID bookings for this les_place's programs
        // First get program IDs for this les_place
        const { data: ownerProgramsData } = await supabase
          .from('programs')
          .select('id')
          .eq('les_place_id', lpData?.id)
        
        const ownerProgramIds = ownerProgramsData?.map(p => p.id) || []
        
        let studentCount = 0
        // Calculate revenue from ALL paid bookings for accuracy
        let totalRevenue = 0
        let allPaidBookings = []
        let allActiveBookings = []

        if (ownerProgramIds.length > 0) {
           // Get Active Student Count
           const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .in('program_id', ownerProgramIds)
            .in('status', ['active', 'confirmed'])
            .in('payment_status', ['paid', 'settlement', 'capture'])
          
          studentCount = count || 0

          // Get All Paid Bookings (For Revenue)
          const { data: bookings } = await supabase
            .from('bookings')
            .select('created_at, program_id, programs(name, price)')
            .in('program_id', ownerProgramIds)
            .in('payment_status', ['paid', 'settlement', 'capture'])
            .order('created_at', { ascending: true })
          
          allPaidBookings = bookings || []
          totalRevenue = allPaidBookings.reduce((sum, b) => sum + (b.programs?.price || 0), 0)

          // Get Active Bookings (For Program Counts)
          const { data: activeB } = await supabase
            .from('bookings')
            .select('program_id')
            .in('program_id', ownerProgramIds)
            .in('status', ['active', 'confirmed'])
          
          allActiveBookings = activeB || []
        }
        
        stats.value.totalStudents.value = studentCount 
        stats.value.totalRevenue.value = totalRevenue

        // Calculate Average Rating from Reviews
        const { data: reviewData } = await supabase
            .from('reviews')
            .select('rating')
            .eq('les_place_id', lpData?.id)
            .eq('is_visible', true)
        
        if (reviewData && reviewData.length > 0) {
            const totalRating = reviewData.reduce((sum, r) => sum + r.rating, 0)
            stats.value.averageRating.value = (totalRating / reviewData.length).toFixed(1)
            stats.value.averageRating.trend = reviewData.length + ' ulasan'
        } else {
             stats.value.averageRating.value = 0
             stats.value.averageRating.trend = '-'
        }

        // 2. Fetch Charts Data
        // Revenue History (Last 6 Months)
        const months = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          months.push({
            label: d.toLocaleDateString('id-ID', { month: 'short' }),
            monthIdx: d.getMonth(),
            year: d.getFullYear()
          })
        }

        // Process Revenue Data (Cumulative per month)
        const monthlyRevenue = months.map(m => {
            const monthlyBookings = allPaidBookings.filter(b => {
                const d = new Date(b.created_at)
                return d.getMonth() === m.monthIdx && d.getFullYear() === m.year
            })
            const val = monthlyBookings.reduce((sum, b) => sum + (b.programs?.price || 0), 0)
            return { label: m.label, value: val }
        })
        revenueData.value = monthlyRevenue

        // Process Student Trend (Daily for last 7 days)
        const days = []
        const today = new Date()
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(d.getDate() - i)
            days.push({
                label: d.toLocaleDateString('id-ID', { weekday: 'short' }), // Sen, Sel (Important: Use short weekday)
                dateStr: d.toDateString()
            })
        }
        
        const { data: recentBookings } = await supabase
            .from('bookings')
            .select('created_at')
            .eq('les_place_id', lpData?.id)
            .in('payment_status', ['paid', 'settlement', 'capture']) // Only paid for charts too
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        
        const dailyStudents = days.map(d => {
            const count = (recentBookings || []).filter(b => new Date(b.created_at).toDateString() === d.dateStr).length
            return { label: d.label, value: count } // RETURN 'value' NOT 'y'
        })
        studentTrendData.value = dailyStudents

        // Process Popular Programs (Calculate dynamically from bookings)
        const { data: allPrograms } = await supabase
            .from('programs')
            .select('id, name, capacity, price')
            .eq('les_place_id', lpData?.id)
            .eq('is_active', true)
        
        // Count students per program from allActiveBookings
        const programCounts = {}
        allActiveBookings.forEach(b => {
            programCounts[b.program_id] = (programCounts[b.program_id] || 0) + 1
        })

        // first map and sort
        let tempPrograms = (allPrograms || []).map(p => ({
            name: p.name,
            count: programCounts[p.id] || 0,
            capacity: p.capacity || 0,
            price: p.price || 0,
        })).sort((a, b) => b.count - a.count).slice(0, 5)

        // Final map with capacity-based percentage
        programDistData.value = tempPrograms.map(p => {
             let pct = 0
             if (p.capacity && p.capacity > 0) {
                 pct = Math.round((p.count / p.capacity) * 100)
             } else {
                 // If capacity is 0/null (Unlimited), we can show full bar or relative?
                 // Let's show 100% to indicate 'Available' or maybe relative to max?
                 // But user specifically asked about 4/10. So for 4/10 it MUST be 40%
                 // For unlimited, let's just default to 100 for now or handling it visually elsewhere?
                 // Actually, if it's unlimited, a "progress bar" doesn't make much sense. 
                 // Let's set to 100 but maybe color differently? For now just 100.
                 pct = 100
             }
             return {
                ...p,
                percentage: pct
             }
        })
        
        // Reset trends
        stats.value.totalRevenue.trend = totalRevenue > 0 ? '+' + new Intl.NumberFormat('id-ID').format(totalRevenue) : '-'
        stats.value.totalStudents.trend = studentCount > 0 ? '+' + studentCount : '-'
        // stats.value.averageRating.value = lpData.rating ? lpData.rating.toFixed(1) : 0
        // stats.value.averageRating.trend = '-' 

        // 3. Recent Registrations
        const { data: registrations } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at,
            students(users(name, email, phone)),
            programs(name, price)
          `)
          .eq('les_place_id', lpData?.id)
          .in('payment_status', ['paid', 'settlement', 'capture']) // Only paid
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
// Helper for currency
function formatCurrency(val) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getStatusClass(status) {
  // Since we only show paid, we can just use success/info
  return 'success' 
}
function getStatusText(status) {
    return 'Lunas'
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
                    <span style="font-weight: 700; font-size: 1.2rem;">Rp</span>
                </div>
                <div class="stat-content">
                    <span class="label">Total Pendapatan</span>
                    <h3 class="value">{{ formatCurrency(stats.totalRevenue.value) }}</h3>
                    <span class="trend" :class="stats.totalRevenue.trendUp ? 'up' : 'down'">
                        {{ stats.totalRevenue.trend }} <span class="muted" v-if="stats.totalRevenue.trend !== '-'">total</span>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
               </div>
               <div class="stat-content">
                   <span class="label">Total Program</span>
                   <h3 class="value">{{ stats.totalPrograms?.value || 0 }}</h3>
                   <span class="trend neutral">
                        {{ stats.totalPrograms?.trend || '-' }}
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
                    <h3 class="section-title">Statistik Pendapatan</h3>
                    <div class="chart-badge">6 Bulan Terakhir</div>
                </div>
                <RevenueChart :data="revenueData" :height="320" />
            </div>

            <!-- Side Charts Column -->
            <div class="side-charts">
                <!-- Popular Programs (List View) -->
                <div class="card distribution-card">
                    <h3 class="section-title">Program Populer</h3>
                    <div class="programs-list-view">
                        <div v-for="(prog, idx) in programDistData" :key="idx" class="program-row">
                            <div class="prog-info">
                                <span class="prog-name">{{ prog.name }}</span>
                                <span class="prog-count">
                                    {{ prog.count }} <span class="muted">/ {{ prog.capacity || '∞' }}</span> Siswa
                                </span>
                            </div>
                            <div class="prog-bar-bg">
                                <div class="prog-bar-fill" :style="{ width: prog.percentage + '%' }"></div>
                            </div>
                        </div>
                        <div v-if="programDistData.length === 0" class="empty-data">
                            Belum ada data program
                        </div>
                    </div>
                </div>

                <!-- Student Trend (Chart) -->
                <div class="card trend-card">
                    <h3 class="section-title">Siswa Baru (Mingguan)</h3>
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
  padding: 20px 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 2px solid transparent;
  transition: all 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-wrapper svg { width: 26px; height: 26px; }
.icon-wrapper.blue { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.green { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.purple { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.orange { background: #F1F5F9; color: #0D5782; }

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-content .label {
  display: block;
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

.stat-content .value {
  font-size: 28px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1;
}

.stat-content .trend {
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
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

.card-header h3,
.section-title {
  font-size: 15px; /* Slightly smaller as requested */
  font-weight: 600;
  color: #1E293B;
  margin: 0;
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

/* Programs List View */
.programs-list-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
}

.program-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prog-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.prog-name {
  font-weight: 500;
  color: #334155;
}

.prog-count {
  font-size: 12px;
  color: #64748B;
  font-weight: 600;
}

.prog-bar-bg {
  width: 100%;
  height: 8px;
  background-color: #F1F5F9;
  border-radius: 99px;
  overflow: hidden;
}

.prog-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0D5782 0%, #0891B2 100%);
  border-radius: 99px;
  transition: width 0.5s ease;
}

.empty-data {
    text-align: center;
    color: #94A3B8;
    font-size: 13px;
    padding: 20px;
}

.chart-badge {
    background: #F1F5F9;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    color: #475569;
    font-weight: 500;
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
