<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const registrations = ref([])
const loading = ref(true)
const filter = ref('all')

onMounted(async () => {
  await fetchRegistrations()
})

async function fetchRegistrations() {
  loading.value = true
  try {
    const { data: owner } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!owner) return

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, payment_status, created_at, start_date,
        students(id, users(name, email, phone)),
        programs(name, price, les_places!inner(name, owner_id))
      `)
      .eq('programs.les_places.owner_id', owner.id)
      .order('created_at', { ascending: false })

    registrations.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const filteredRegistrations = computed(() => {
  if (filter.value === 'all') return registrations.value
  return registrations.value.filter(reg => reg.status === filter.value)
})

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStatusClass(status) {
  const classes = { pending: 'warning', active: 'success', completed: 'info', cancelled: 'error' }
  return classes[status] || ''
}

function getStatusText(status) {
  const texts = { pending: 'Menunggu', active: 'Aktif', completed: 'Selesai', cancelled: 'Dibatalkan' }
  return texts[status] || status
}

function getPaymentStatusClass(status) {
  const classes = { paid: 'success', settlement: 'success', capture: 'success', pending: 'warning', failed: 'error', expire: 'error' }
  return classes[status] || 'warning'
}

function getPaymentStatusText(status) {
  const texts = { paid: 'Lunas', settlement: 'Lunas', capture: 'Lunas', pending: 'Belum Bayar', failed: 'Gagal', expire: 'Kadaluarsa' }
  return texts[status] || 'Menunggu'
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main">
      <header class="header">
        <h1>Pendaftaran Siswa</h1>
      </header>

      <div class="filter-bar">
        <button :class="['filter-btn', { active: filter === 'all' }]" @click="filter = 'all'">Semua</button>
        <button :class="['filter-btn', { active: filter === 'pending' }]" @click="filter = 'pending'">Menunggu</button>
        <button :class="['filter-btn', { active: filter === 'active' }]" @click="filter = 'active'">Aktif</button>
        <button :class="['filter-btn', { active: filter === 'completed' }]" @click="filter = 'completed'">Selesai</button>
        <button :class="['filter-btn', { active: filter === 'cancelled' }]" @click="filter = 'cancelled'">Dibatalkan</button>
      </div>

      <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

      <div v-else-if="filteredRegistrations.length" class="table-container">
        <table>
          <thead>
            <tr>
              <th width="50" style="text-align: center">No</th>
              <th>Siswa</th>
              <th>Program</th>
              <th>Tanggal Daftar</th>
              <th>Pembayaran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(reg, index) in filteredRegistrations" :key="reg.id">
              <td style="text-align: center; color: var(--text-muted); font-size: 13px;">{{ index + 1 }}</td>
              <td>
                <strong>{{ reg.students?.users?.name || 'N/A' }}</strong>
                <div class="text-muted">{{ reg.students?.users?.phone || '-' }}</div>
                <div class="text-muted" style="font-size: 11px">{{ reg.students?.users?.email }}</div>
              </td>
              <td>{{ reg.programs?.name }}</td>
              <td>{{ formatDate(reg.created_at) }}</td>
              <td><span class="badge" :class="getPaymentStatusClass(reg.payment_status)">{{ getPaymentStatusText(reg.payment_status) }}</span></td>
              <td><span class="badge" :class="getStatusClass(reg.status)">{{ getStatusText(reg.status) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <h3>Belum ada pendaftaran</h3>
        <p>Pendaftaran siswa akan muncul di sini</p>
      </div>
    </main>

    
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.sidebar{width:280px;background:linear-gradient(180deg,#0a4568 0%,#083350 100%);color:white;padding:var(--spacing-lg);display:flex;flex-direction:column}
.logo{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-sm)}
.role-badge{font-size:var(--font-size-xs);background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:var(--radius-full);width:fit-content;margin-bottom:var(--spacing-xl)}
.nav{flex:1;display:flex;flex-direction:column;gap:var(--spacing-xs)}
.nav-item{padding:var(--spacing-md);border-radius:var(--radius-lg);color:rgba(255,255,255,0.7);font-size:var(--font-size-sm)}
.nav-item:hover,.nav-item.active{background:rgba(255,255,255,0.1);color:white}
.logout-btn{padding:var(--spacing-md);border-radius:var(--radius-lg);color:rgba(255,255,255,0.7);margin-top:auto;background:transparent;border:1px solid rgba(255,255,255,0.2);font-size:var(--font-size-sm)}
.logout-btn:hover{background:rgba(255,255,255,0.1);color:white}
.main{flex:1;padding:var(--spacing-xl)}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-lg)}
.header h1{font-size:var(--font-size-2xl)}
.filter-bar{display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-xl)}
.filter-btn{padding:var(--spacing-sm) var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);background:white;font-weight:500}
.filter-btn:hover{border-color:var(--primary)}
.filter-btn.active{background:var(--secondary);color:white;border-color:var(--secondary)}
.loading-state{display:flex;justify-content:center;padding:var(--spacing-3xl)}
.table-container{background:white;border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-sm)}
table{width:100%;border-collapse:collapse}
th,td{padding:var(--spacing-md);text-align:left;border-bottom:1px solid var(--border)}
th{background:#f1f5f9;font-weight:700;color:var(--text-color);font-size:var(--font-size-sm);border-bottom: 2px solid #e2e8f0; border-right: 1px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;}
th:last-child{border-right:none}
.text-muted{color:var(--text-muted);font-size:var(--font-size-xs)}
.badge{padding:4px 12px;border-radius:var(--radius-full);font-size:var(--font-size-xs);font-weight:600}
.badge.warning{background:#fef3c7;color:#d97706}
.badge.success{background:#dcfce7;color:#16a34a}
.badge.info{background:#dbeafe;color:#2563eb}
.badge.error{background:#fee2e2;color:#dc2626}
.btn-success{background:var(--success);color:white}
.btn-error{background:var(--error);color:white}
.empty-state{background:white;border-radius:var(--radius-xl);padding:var(--spacing-3xl);text-align:center}
.empty-state h3{margin-bottom:var(--spacing-sm)}
.empty-state p{color:var(--text-muted)}
@media(max-width:768px){.sidebar{display:none}}
</style>
