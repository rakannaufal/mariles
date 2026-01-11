<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import StatCard from '@/components/StatCard.vue'
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const loading = ref(true)
const activeTab = ref('reviews')
const filterStatus = ref('all')

const reviews = ref([])
const reports = ref([])

const showModal = ref(false)
const selectedItem = ref(null)
const modalType = ref('review') // 'review' or 'report'

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

const stats = ref({
  totalReviews: 0,
  flaggedReviews: 0,
  pendingReports: 0,
  resolvedReports: 0
})

const authStore = useAuthStore()
const debugRole = computed(() => authStore.userRole)
const userEmail = computed(() => authStore.user?.email)

// Response Modal
const showResponseModal = ref(false)
const responseReport = ref(null)
const responseStatus = ref('')
const responseMessage = ref('')

const statusOptions = [
  { value: 'investigating', label: 'Investigasi', desc: 'Sedang dalam penyelidikan' },
  { value: 'resolved', label: 'Selesai', desc: 'Laporan valid dan sudah ditindaklanjuti' },
  { value: 'dismissed', label: 'Ditolak', desc: 'Laporan tidak valid atau tidak cukup bukti' }
]

// Flag Modal
const showFlagModal = ref(false)
const flaggingReview = ref(null)
const flagReason = ref('')
const flagReasonOptions = [
  'Mengandung kata-kata kasar atau tidak sopan',
  'Spam atau promosi tidak relevan',
  'Informasi palsu atau menyesatkan',
  'Melanggar privasi orang lain',
  'Alasan lainnya'
]

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // 1. Fetch Reviews - includes moderation columns
    const { data: reviewData, count: reviewCount, error: reviewError } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_flagged, is_visible, flag_reason, created_at, student_id, les_place_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50)

    if (reviewError) {
      console.error('Review fetch error:', reviewError)
      // If is_flagged column doesn't exist, fallback to query without it
      if (reviewError.code === '42703') {
        const { data: fallbackData, count: fallbackCount } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, student_id, les_place_id', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (fallbackData && fallbackData.length > 0) {
          const studentIds = [...new Set(fallbackData.map(r => r.student_id).filter(Boolean))]
          const lesPlaceIds = [...new Set(fallbackData.map(r => r.les_place_id).filter(Boolean))]
          
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, users(name)')
            .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
          
          const { data: lesPlacesData } = await supabase
            .from('les_places')
            .select('id, name')
            .in('id', lesPlaceIds.length > 0 ? lesPlaceIds : ['00000000-0000-0000-0000-000000000000'])
          
          const studentMap = {}
          const lesPlaceMap = {}
          ;(studentsData || []).forEach(s => { studentMap[s.id] = s.users?.name || 'Anonim' })
          ;(lesPlacesData || []).forEach(l => { lesPlaceMap[l.id] = l.name })
          
          reviews.value = fallbackData.map(r => ({
            ...r,
            is_flagged: false,
            students: { users: { name: studentMap[r.student_id] || 'Anonim' } },
            les_places: { name: lesPlaceMap[r.les_place_id] || 'Unknown' }
          }))
        }
        stats.value.totalReviews = fallbackCount || 0
        stats.value.flaggedReviews = 0
        loading.value = false
        return
      }
    }

    // Fetch student and les_place names separately
    if (reviewData && reviewData.length > 0) {
      const studentIds = [...new Set(reviewData.map(r => r.student_id).filter(Boolean))]
      const lesPlaceIds = [...new Set(reviewData.map(r => r.les_place_id).filter(Boolean))]
      
      // Fetch students with users
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, users(name)')
        .in('id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      
      // Fetch les_places
      const { data: lesPlacesData } = await supabase
        .from('les_places')
        .select('id, name')
        .in('id', lesPlaceIds.length > 0 ? lesPlaceIds : ['00000000-0000-0000-0000-000000000000'])
      
      // Map data
      const studentMap = {}
      const lesPlaceMap = {}
      ;(studentsData || []).forEach(s => { studentMap[s.id] = s.users?.name || 'Anonim' })
      ;(lesPlacesData || []).forEach(l => { lesPlaceMap[l.id] = l.name })
      
      // Enrich reviews
      reviews.value = reviewData.map(r => ({
        ...r,
        is_flagged: r.is_flagged ?? false,
        students: { users: { name: studentMap[r.student_id] || 'Anonim' } },
        les_places: { name: lesPlaceMap[r.les_place_id] || 'Unknown' }
      }))
    } else {
      reviews.value = reviewData || []
    }

    stats.value.totalReviews = reviewCount || 0
    stats.value.flaggedReviews = (reviews.value || []).filter(r => r.is_flagged).length

    // 2. Fetch Reports (New Table)
    const { data: reportData } = await supabase
      .from('reports')
      .select(`
        id, target_type, target_id, reason, description, status, created_at,
        users:reporter_id (name, email)
      `)
      .order('created_at', { ascending: false })
    
    // 3. Fetch details for Forum Posts/Comments
    if (reportData && reportData.length > 0) {
      const postIds = reportData.filter(r => r.target_type === 'forum_post').map(r => r.target_id)
      const commentIds = reportData.filter(r => r.target_type === 'forum_comment').map(r => r.target_id)
      
      let posts = [], comments = []
      
      if (postIds.length > 0) {
        const { data } = await supabase.from('forum_posts').select('id, title, content').in('id', postIds)
        posts = data || []
      }
      
      if (commentIds.length > 0) {
        const { data } = await supabase.from('forum_comments').select('id, content').in('id', commentIds)
        comments = data || []
      }
      
      // Map details to reports
      reports.value = reportData.map(r => {
        let details = null
        if (r.target_type === 'forum_post') details = posts.find(p => p.id === r.target_id)
        else if (r.target_type === 'forum_comment') details = comments.find(c => c.id === r.target_id)
        
        return { ...r, target_details: details }
      })
    } else {
      reports.value = []
    }
    
    stats.value.pendingReports = (reportData || []).filter(r => r.status === 'pending').length
    stats.value.resolvedReports = (reportData || []).filter(r => r.status === 'resolved').length

  } catch (err) {
    console.error('Error:', err)
    toast(`Error: ${err.message || 'Gagal memuat data'}`, 'error')
  } finally {
    loading.value = false
  }
}

async function deleteReportedContent(report) {
  if (!confirm('Hapus konten yang dilaporkan? Ini akan menghapus postingan/komentar secara permanen dan memberitahu pemiliknya.')) return
  
  try {
    const table = report.target_type === 'forum_post' ? 'forum_posts' : 'forum_comments'
    
    // 1. Get content owner to notify
    const { data: contentData } = await supabase.from(table).select('user_id').eq('id', report.target_id).single()
    
    // 2. Delete content
    const { error } = await supabase.from(table).delete().eq('id', report.target_id)
    if (error) throw error
    
    // 3. Update report status
    await supabase.from('reports').update({ 
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      admin_note: 'Content deleted by admin'
    }).eq('id', report.id)
    
    // 4. Notify User
    // 4. Notify User (Owner)
    if (contentData?.user_id) {
       await supabase.from('notifications').insert({
          user_id: contentData.user_id,
          type: 'content_removed',
          title: 'Konten Anda Dihapus',
          message: `Konten Anda (${report.target_type === 'forum_post' ? 'Postingan' : 'Komentar'}) telah dihapus oleh admin karena melanggar aturan komunitas (Laporan: ${report.reason}).`,
          is_read: false,
          created_at: new Date().toISOString()
       })
    }

    // 5. Notify Reporter
    if (report.reporter_id) {
       await supabase.from('notifications').insert({
          user_id: report.reporter_id,
          type: 'report_resolved',
          title: 'Laporan Anda Ditindaklanjuti',
          message: `Laporan Anda mengenai ${report.target_type === 'forum_post' ? 'postingan' : 'komentar'} telah kami terima dan konten tersebut telah dihapus. Terima kasih atas bantuan Anda menjaga komunitas.`,
          is_read: false,
          created_at: new Date().toISOString()
       })
    }
    
    toast('Konten berhasil dihapus & laporan diselesaikan', 'success')
    await fetchData()
  } catch(e) {
    console.error(e)
    toast('Gagal menghapus konten', 'error')
  }
}

// Actions
function openModal(item, type) {
  selectedItem.value = item
  modalType.value = type
  showModal.value = true
}

function openResponseModal(report) {
  responseReport.value = report
  responseStatus.value = report.status === 'pending' ? 'investigating' : report.status
  responseMessage.value = ''
  showResponseModal.value = true
}

function closeResponseModal() {
  showResponseModal.value = false
  responseReport.value = null
  responseStatus.value = ''
  responseMessage.value = ''
}

async function submitResponse() {
  if (!responseStatus.value) {
    toast('Pilih status laporan', 'error')
    return
  }
  
  if (!responseMessage.value.trim()) {
    toast('Masukkan pesan tanggapan', 'error')
    return
  }
  
  try {
    const currentUser = (await supabase.auth.getUser()).data.user
    
    // Update report status
    await supabase.from('reports').update({ 
      status: responseStatus.value,
      admin_response: responseMessage.value,
      resolved_at: ['resolved', 'dismissed'].includes(responseStatus.value) ? new Date().toISOString() : null,
      resolved_by: currentUser?.id || null
    }).eq('id', responseReport.value.id)
    
    // Send notification to reporter
    const notifTitle = getNotificationTitle(responseStatus.value)
    const notifMessage = `Laporan Anda tentang ${responseReport.value.target_type === 'les_place' ? 'tempat les' : 'konten'} telah ${getStatusLabel(responseStatus.value).toLowerCase()}. Pesan dari admin: ${responseMessage.value}`
    
    await supabase.from('notifications').insert({
      user_id: responseReport.value.reporter_id,
      type: 'report_' + responseStatus.value,
      title: notifTitle,
      message: notifMessage,
      is_read: false,
      created_at: new Date().toISOString()
    })
    
    await fetchData()
    closeResponseModal()
    toast('Tanggapan berhasil dikirim ke pelapor', 'success')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal mengirim tanggapan', 'error')
  }
}

function getNotificationTitle(status) {
  const titles = {
    investigating: 'Laporan Sedang Diinvestigasi',
    resolved: 'Laporan Anda Telah Ditindaklanjuti',
    dismissed: 'Laporan Anda Ditolak'
  }
  return titles[status] || 'Update Laporan'
}

// Open flag modal
function openFlagModal(review) {
  flaggingReview.value = review
  flagReason.value = ''
  showFlagModal.value = true
}

function closeFlagModal() {
  showFlagModal.value = false
  flaggingReview.value = null
  flagReason.value = ''
}

// Enhanced flag with reason, visibility toggle, and notification
async function submitFlag() {
  if (!flagReason.value) {
    toast('Pilih alasan flag', 'error')
    return
  }
  
  try {
    const currentUser = (await supabase.auth.getUser()).data.user
    
    // Update review: flag it, hide from public, add reason
    await supabase.from('reviews').update({ 
      is_flagged: true,
      is_visible: false, // Hide from public
      flag_reason: flagReason.value,
      flagged_at: new Date().toISOString(),
      flagged_by: currentUser?.id || null
    }).eq('id', flaggingReview.value.id)
    
    // Send notification to the student
    if (flaggingReview.value.student_id) {
      // Get student's user_id
      const { data: studentData } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', flaggingReview.value.student_id)
        .single()
      
      if (studentData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: studentData.user_id,
          type: 'review_flagged',
          title: 'Ulasan Anda Ditandai',
          message: `Ulasan Anda untuk "${flaggingReview.value.les_places?.name || 'tempat les'}" telah ditinjau oleh admin. Alasan: ${flagReason.value}. Review akan disembunyikan sementara dari publik.`,
          is_read: false,
          created_at: new Date().toISOString()
        })
      }
    }
    
    await fetchData()
    closeFlagModal()
    toast('Review ditandai dan disembunyikan dari publik', 'warning')
  } catch (err) {
    console.error('Error flagging review:', err)
    toast('Gagal menandai review', 'error')
  }
}

// Unflag and make visible again
async function unflagReview(review) {
  try {
    await supabase.from('reviews').update({ 
      is_flagged: false,
      is_visible: true, // Show again
      flag_reason: null,
      flagged_at: null,
      flagged_by: null
    }).eq('id', review.id)
    
    // Notify student that their review is restored
    if (review.student_id) {
      const { data: studentData } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', review.student_id)
        .single()
      
      if (studentData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: studentData.user_id,
          type: 'review_restored',
          title: 'Ulasan Anda Dipulihkan',
          message: `Ulasan Anda untuk "${review.les_places?.name || 'tempat les'}" telah dipulihkan dan sekarang dapat dilihat publik kembali.`,
          is_read: false,
          created_at: new Date().toISOString()
        })
      }
    }
    
    await fetchData()
    toast('Flag dihapus, review tampil kembali', 'success')
  } catch (err) {
    toast('Gagal menghapus flag', 'error')
  }
}

// Delete with notification
async function deleteReview(review) {
  if (!confirm('Hapus review ini secara permanen? Siswa akan diberitahu.')) return
  try {
    // Notify student before deleting
    if (review.student_id) {
      const { data: studentData } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', review.student_id)
        .single()
      
      if (studentData?.user_id) {
        await supabase.from('notifications').insert({
          user_id: studentData.user_id,
          type: 'review_deleted',
          title: 'Ulasan Anda Dihapus',
          message: `Ulasan Anda untuk "${review.les_places?.name || 'tempat les'}" telah dihapus oleh admin karena melanggar ketentuan platform.`,
          is_read: false,
          created_at: new Date().toISOString()
        })
      }
    }
    
    await supabase.from('reviews').delete().eq('id', review.id)
    await fetchData()
    showModal.value = false
    toast('Review berhasil dihapus, siswa telah diberitahu', 'success')
  } catch (err) {
    toast('Gagal menghapus', 'error')
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

// Helpers
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStatusLabel(status) {
  const map = { pending: 'Menunggu', investigating: 'Investigasi', resolved: 'Selesai', dismissed: 'Ditolak' }
  return map[status] || status
}

const filteredReports = computed(() => {
  if (filterStatus.value === 'all') return reports.value
  return reports.value.filter(r => r.status === filterStatus.value)
})
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />
    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">
        <div class="toast-content">
          <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {{ toastMessage }}
        </div>
      </div>
    </Transition>

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Moderasi Konten
          </h1>
          <p class="subtitle">Pusat kontrol untuk menjaga kualitas komunitas dan konten.</p>
        </div>
      </header>

      <!-- Stats Row -->
      <section class="stats-row">
        <StatCard 
            label="Total Review" 
            :value="stats.totalReviews" 
            icon-color="blue"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Review Diflag" 
            :value="stats.flaggedReviews" 
            icon-color="red"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
            </template>
            <template #extra>
              <span class="stat-hint text-red" v-if="stats.flaggedReviews > 0">Perlu ditinjau</span>
            </template>
        </StatCard>

        <StatCard 
            label="Laporan Masuk" 
            :value="stats.pendingReports" 
            icon-color="orange"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </template>
            <template #extra>
              <span class="stat-hint text-orange" v-if="stats.pendingReports > 0">Tindakan diperlukan</span>
            </template>
        </StatCard>

        <StatCard 
            label="Laporan Selesai" 
            :value="stats.resolvedReports" 
            icon-color="green"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </template>
        </StatCard>
      </section>

      <!-- Tabs & Content -->
      <div class="content-wrapper">
        <div class="tabs">
          <button :class="{ active: activeTab === 'reviews' }" @click="activeTab = 'reviews'">
            Review Pengguna
            <span class="count">{{ reviews.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">
            Laporan Masuk
            <span class="count warning" v-if="reports.length > 0">{{ reports.length }}</span>
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data moderasi...</p>
        </div>

        <!-- REVIEWS TAB -->
        <section v-else-if="activeTab === 'reviews'" class="tab-content">
          <div v-if="reviews.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <h3>Belum Ada Review</h3>
            <p>Review dari pengguna akan muncul di sini</p>
          </div>

          <div v-else class="reviews-grid">
            <div v-for="review in reviews" :key="review.id" class="review-card" :class="{ flagged: review.is_flagged }">
              <div class="flagged-banner" v-if="review.is_flagged">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                Ditandai oleh admin
              </div>
              <div v-if="review.is_flagged && review.flag_reason" class="flag-reason-banner">
                <strong>Alasan:</strong> {{ review.flag_reason }}
              </div>
              <div class="card-body">
                <div class="review-header">
                  <div class="user-info">
                    <div class="avatar">{{ review.students?.users?.name?.charAt(0) || 'U' }}</div>
                    <div>
                      <span class="name">{{ review.students?.users?.name || 'Anonim' }}</span>
                      <span class="place">untuk {{ review.les_places?.name }}</span>
                    </div>
                  </div>
                  <div class="rating">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>{{ review.rating }}</span>
                  </div>
                </div>
                <p class="comment">{{ review.comment || 'Tidak ada komentar tertulis.' }}</p>
                <div v-if="review.is_flagged" class="visibility-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  Tersembunyi dari publik
                </div>
                <div class="card-footer">
                  <span class="date">{{ formatDate(review.created_at) }}</span>
                  <div class="actions">
                    <button v-if="!review.is_flagged" class="btn-action flag" @click="openFlagModal(review)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                      Tandai
                    </button>
                    <button v-else class="btn-action unflag" @click="unflagReview(review)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Pulihkan
                    </button>
                    <button class="btn-action delete" @click="deleteReview(review)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- REPORTS TAB -->
        <section v-else-if="activeTab === 'reports'" class="tab-content">
          <div class="filters-bar">
            <div class="filter-group">
              <button :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">Semua</button>
              <button :class="{ active: filterStatus === 'pending' }" @click="filterStatus = 'pending'">Pending</button>
              <button :class="{ active: filterStatus === 'investigating' }" @click="filterStatus = 'investigating'">Investigasi</button>
              <button :class="{ active: filterStatus === 'resolved' }" @click="filterStatus = 'resolved'">Selesai</button>
            </div>
          </div>

          <div v-if="filteredReports.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h3>Tidak Ada Laporan</h3>
            <p>Semua laporan telah ditangani atau belum ada laporan baru.</p>
          </div>

          <div v-else class="reports-list">
            <div v-for="report in filteredReports" :key="report.id" class="report-item">
              <div class="report-status" :class="report.status">
                {{ getStatusLabel(report.status) }}
              </div>
              <div class="report-main">
                <div class="report-header">
                  <span class="report-type">{{ report.target_type }}</span>
                  <span class="report-date">{{ formatDate(report.created_at) }}</span>
                </div>
                <h4>{{ report.reason }}</h4>
                <p>{{ report.description }}</p>
                <div class="reporter">
                  Pelapor: {{ report.users?.name || 'Anonim' }}
                </div>
                <!-- Content Preview -->
                <div v-if="report.target_details" class="content-preview">
                   <div class="preview-label">Konten yang dilaporkan:</div>
                   <strong v-if="report.target_details.title">{{ report.target_details.title }}</strong>
                   <p>"{{ report.target_details.content?.substring(0, 100) }}..."</p>
                </div>
                <div v-else-if="report.status !== 'resolved'" class="content-preview error">
                   Konten tidak ditemukan (mungkin sudah dihapus)
                </div>
              </div>
              <div class="report-actions">
                <button 
                  v-if="report.status === 'pending' && report.target_details"
                  class="btn-sm delete" 
                  @click="deleteReportedContent(report)"
                  title="Hapus Konten & Selesaikan"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Hapus Konten
                </button>
                <button class="btn-sm respond" @click="openResponseModal(report)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  Tanggapi
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>

    <!-- Response Modal -->
    <Teleport to="body">
      <div v-if="showResponseModal && responseReport" class="response-modal-overlay" @click.self="closeResponseModal">
        <div class="response-modal">
          <button class="modal-close" @click="closeResponseModal">&times;</button>
          
          <div class="response-modal-header">
            <h3>Tanggapi Laporan</h3>
            <p>Dari: {{ responseReport.users?.name || 'Anonim' }}</p>
          </div>
          
          <div class="response-modal-info">
            <div class="info-row">
              <span class="info-label">Alasan:</span>
              <span class="info-value">{{ responseReport.reason }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Deskripsi:</span>
              <span class="info-value">{{ responseReport.description }}</span>
            </div>
          </div>
          
          <div class="response-form">
            <div class="form-group">
              <label>Status Laporan</label>
              <div class="status-options">
                <label 
                  v-for="option in statusOptions" 
                  :key="option.value"
                  class="status-option"
                  :class="{ selected: responseStatus === option.value }"
                >
                  <input type="radio" v-model="responseStatus" :value="option.value">
                  <div class="status-content">
                    <span class="status-label">{{ option.label }}</span>
                    <span class="status-desc">{{ option.desc }}</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Pesan Tanggapan untuk Pelapor</label>
              <textarea 
                v-model="responseMessage" 
                placeholder="Tulis pesan tanggapan yang akan dikirim ke pelapor..."
                rows="4"
              ></textarea>
              <span class="helper-text">Pesan ini akan dikirim sebagai notifikasi ke pelapor.</span>
            </div>
          </div>
          
          <div class="response-modal-actions">
            <button class="btn-cancel" @click="closeResponseModal">Batal</button>
            <button 
              class="btn-submit" 
              @click="submitResponse"
              :disabled="!responseStatus || !responseMessage.trim()"
            >
              Kirim Tanggapan
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Flag Modal -->
    <Teleport to="body">
      <div v-if="showFlagModal && flaggingReview" class="flag-modal-overlay" @click.self="closeFlagModal">
        <div class="flag-modal">
          <button class="modal-close" @click="closeFlagModal">&times;</button>
          
          <div class="flag-modal-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            <h3>Tandai Review</h3>
          </div>
          
          <div class="flag-modal-info">
            <p><strong>Review dari:</strong> {{ flaggingReview.students?.users?.name || 'Anonim' }}</p>
            <p class="review-preview">"{{ flaggingReview.comment || 'Tidak ada komentar' }}"</p>
          </div>
          
          <div class="flag-modal-form">
            <label>Pilih alasan penandaan:</label>
            <div class="reason-options">
              <label v-for="reason in flagReasonOptions" :key="reason" class="reason-option" :class="{ selected: flagReason === reason }">
                <input type="radio" v-model="flagReason" :value="reason">
                <span>{{ reason }}</span>
              </label>
            </div>
          </div>
          
          <div class="flag-modal-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Review yang ditandai akan <strong>disembunyikan dari publik</strong> dan siswa akan menerima notifikasi.</span>
          </div>
          
          <div class="flag-modal-actions">
            <button class="btn-cancel" @click="closeFlagModal">Batal</button>
            <button class="btn-flag" @click="submitFlag" :disabled="!flagReason">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
              Tandai & Sembunyikan
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; max-width: 1400px; margin: 0 auto; }

/* Header */
.page-header { margin-bottom: 32px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 8px; letter-spacing: -0.5px; }
.header-left h1 svg { width: 32px; height: 32px; color: #0F172A; }
.subtitle { color: #64748B; font-size: 15px; }

/* Stats */
.stats-row { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 32px; 
  width: 100%;
}

/* StatCard styling handled by component */
.stat-hint { font-size: 11px; margin-top: 4px; display: block; }
.text-red { color: #EF4444; }
.text-orange { color: #F97316; }

/* Tabs */
.content-wrapper { background: white; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; min-height: 500px; display: flex; flex-direction: column; }
.tabs { display: flex; border-bottom: 1px solid #E2E8F0; padding: 0 24px; background: #FFF; }
.tabs button { padding: 20px 24px; background: transparent; border: none; font-size: 14px; font-weight: 600; color: #64748B; cursor: pointer; border-bottom: 2px solid transparent; display: flex; gap: 8px; align-items: center; transition: all 0.2s; }
.tabs button:hover { color: #334155; }
.tabs button.active { color: #0F172A; border-bottom-color: #0F172A; }
.count { background: #F1F5F9; color: #475569; font-size: 11px; padding: 2px 8px; border-radius: 12px; }
.count.warning { background: #FEF2F2; color: #DC2626; }

.tab-content { padding: 32px; background: #F8FAFC; flex: 1; }

/* Reviews Grid */
.reviews-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; }
.review-card { background: white; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; transition: transform 0.2s; display: flex; flex-direction: column; }
.review-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
.review-card.flagged { border-color: #FECACA; background: #FEF2F2; }

.flagged-banner { background: #FEF2F2; color: #DC2626; font-size: 12px; font-weight: 600; padding: 8px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #FECACA; }
.flagged-banner svg { width: 14px; height: 14px; }

.card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
.review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.user-info { display: flex; gap: 12px; align-items: center; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #F1F5F9; color: #64748B; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.name { display: block; font-weight: 600; color: #1E293B; font-size: 14px; }
.place { display: block; font-size: 12px; color: #64748B; }

.rating { display: flex; align-items: center; gap: 4px; font-weight: 700; color: #F59E0B; font-size: 14px; background: #FFF7ED; padding: 4px 8px; border-radius: 6px; }
.rating .star { width: 14px; height: 14px; }

.comment { font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px; flex: 1; }

.card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #F1F5F9; }
.date { font-size: 12px; color: #94A3B8; }

.actions { display: flex; gap: 8px; }
.btn-action { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
.btn-action svg { width: 14px; height: 14px; flex-shrink: 0; }
.btn-action.flag { background: #FFF7ED; color: #D97706; }
.btn-action.flag:hover { background: #FFEDD5; color: #C2410C; }
.btn-action.unflag { background: #ECFDF5; color: #059669; }
.btn-action.unflag:hover { background: #D1FAE5; color: #047857; }
.btn-action.delete { background: #FEF2F2; color: #DC2626; }
.btn-action.delete:hover { background: #FECACA; color: #B91C1C; }

/* Reports List */
.reports-list { display: flex; flex-direction: column; gap: 16px; }
.report-item { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; display: flex; gap: 20px; align-items: flex-start; }
.report-status { text-transform: capitalize; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.report-status.pending { background: #FFF7ED; color: #C2410C; }
.report-status.investigating { background: #EFF6FF; color: #1D4ED8; }
.report-status.resolved { background: #F0FDF4; color: #15803D; }
.report-status.dismissed { background: #F1F5F9; color: #64748B; }

.report-main { flex: 1; }
.report-header { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; font-size: 12px; color: #64748B; }
.report-type { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
.report-main h4 { font-size: 15px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.report-main p { font-size: 14px; color: #475569; margin-bottom: 12px; }
.reporter { font-size: 12px; color: #94A3B8; font-style: italic; }

.content-preview { margin-top: 12px; padding: 12px; background: #F8FAFC; border-radius: 8px; border-left: 3px solid #CBD5E1; font-size: 13px; }
.content-preview.error { color: #EF4444; background: #FEF2F2; border-color: #FECACA; }
.preview-label { font-size: 11px; color: #64748B; margin-bottom: 4px; text-transform: uppercase; font-weight: 700; }

.report-actions { display: flex; flex-direction: column; gap: 8px; }
.btn-sm { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; transition: all 0.2s; }
.btn-sm.respond { background: #F1F5F9; color: #334155; }
.btn-sm.respond:hover { background: #E2E8F0; }
.btn-sm.delete { background: #FEF2F2; color: #DC2626; }
.btn-sm.delete:hover { background: #FECACA; }
.btn-sm svg { width: 14px; height: 14px; }
.filters-bar { margin-bottom: 24px; display: flex; gap: 12px; }
.filter-group { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 8px; border: 1px solid #E2E8F0; }
.filter-group button { padding: 6px 16px; border: none; background: transparent; border-radius: 6px; font-size: 13px; font-weight: 500; color: #64748B; cursor: pointer; }
.filter-group button.active { background: #F1F5F9; color: #0F172A; font-weight: 600; }

.reports-list { display: flex; flex-direction: column; gap: 16px; }
.report-item { background: white; border-radius: 12px; padding: 20px; border: 1px solid #E2E8F0; display: flex; gap: 20px; align-items: flex-start; }
.report-status { text-transform: capitalize; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
.report-status.pending { background: #FFF7ED; color: #EA580C; }
.report-status.investigating { background: #EFF6FF; color: #2563EB; }
.report-status.resolved { background: #ECFDF5; color: #059669; }
.report-status.dismissed { background: #F1F5F9; color: #94A3B8; }

.report-main { flex: 1; }
.report-header { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.report-type { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px; }
.report-date { font-size: 12px; color: #94A3B8; }
.report-item h4 { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
.report-item p { font-size: 14px; color: #475569; margin-bottom: 8px; }
.reporter { font-size: 12px; color: #64748B; }

.report-actions { display: flex; flex-direction: column; gap: 8px; }
.btn-sm { padding: 6px 12px; border-radius: 6px; border: 1px solid transparent; font-size: 12px; font-weight: 600; cursor: pointer; width: 100px; }
.btn-sm.investigate { background: white; border-color: #CBD5E1; color: #334155; }
.btn-sm.resolve { background: #10B981; color: white; }
.btn-sm.dismiss { background: transparent; color: #64748B; }
.btn-sm:hover { opacity: 0.9; }

/* Empty & Loading */
.loading-state, .empty-state { text-align: center; padding: 60px; color: #64748B; }
.spinner { margin: 0 auto 16px; width: 32px; height: 32px; border: 3px solid #E2E8F0; border-top-color: #0F172A; border-radius: 50%; animation: spin 1s linear infinite; }
.empty-icon svg { width: 48px; height: 48px; opacity: 0.5; margin-bottom: 12px; }

/* Toast */
.toast { position: fixed; top: 24px; right: 24px; z-index: 100; animation: slideIn 0.3s ease-out; }
.toast-content { background: #1E293B; color: white; padding: 12px 20px; border-radius: 10px; display: flex; align-items: center; gap: 12px; font-weight: 500; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.toast.error .toast-content { background: #EF4444; }
.toast.warning .toast-content { background: #F59E0B; }
.toast-content svg { width: 20px; height: 20px; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .report-item { flex-direction: column; }
  .report-actions { flex-direction: row; width: 100%; justify-content: flex-end; }
}

/* Response Modal */
.response-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.response-modal { background: white; border-radius: 20px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; position: relative; }
.response-modal .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: none; background: #F1F5F9; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; }
.response-modal-header { padding: 24px 24px 16px; border-bottom: 1px solid #E2E8F0; }
.response-modal-header h3 { font-size: 20px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
.response-modal-header p { font-size: 14px; color: #64748B; }
.response-modal-info { padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.info-row { margin-bottom: 8px; }
.info-row:last-child { margin-bottom: 0; }
.info-label { font-weight: 600; font-size: 13px; color: #475569; margin-right: 8px; }
.info-value { font-size: 13px; color: #1E293B; }
.response-form { padding: 20px 24px; }
.response-form .form-group { margin-bottom: 20px; }
.response-form .form-group:last-child { margin-bottom: 0; }
.response-form label { display: block; font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 10px; }
.status-options { display: flex; flex-direction: column; gap: 10px; }
.status-option { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 2px solid #E2E8F0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.status-option:hover { border-color: #CBD5E1; }
.status-option.selected { border-color: #0A4568; background: rgba(10, 69, 104, 0.05); }
.status-option input { display: none; }
.status-content { display: flex; flex-direction: column; gap: 2px; }
.status-label { font-weight: 600; font-size: 14px; color: #1E293B; }
.status-desc { font-size: 12px; color: #64748B; }
.response-form textarea { width: 100%; padding: 14px; border: 1px solid #E2E8F0; border-radius: 12px; font-size: 14px; resize: vertical; font-family: inherit; min-height: 100px; }
.response-form textarea:focus { outline: none; border-color: #0A4568; }
.helper-text { display: block; font-size: 12px; color: #94A3B8; margin-top: 8px; }
.response-modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #E2E8F0; background: #F8FAFC; border-radius: 0 0 20px 20px; }
.response-modal-actions .btn-cancel { padding: 12px 24px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; }
.response-modal-actions .btn-submit { padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; }
.response-modal-actions .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Respond Button */
.btn-sm.respond { display: flex; align-items: center; gap: 6px; background: #0A4568; color: white; padding: 8px 16px; }
.btn-sm.respond svg { width: 14px; height: 14px; }
.btn-sm.respond:hover { background: #083350; }

/* Flag Reason Banner */
.flag-reason-banner { background: #FEF3C7; color: #92400E; font-size: 12px; padding: 8px 16px; border-bottom: 1px solid #FDE68A; }
.flag-reason-banner strong { font-weight: 600; }

/* Visibility Badge */
.visibility-badge { display: inline-flex; align-items: center; gap: 6px; background: #FEE2E2; color: #DC2626; font-size: 11px; font-weight: 600; padding: 6px 10px; border-radius: 6px; margin-bottom: 12px; }
.visibility-badge svg { width: 14px; height: 14px; }

/* Flag Modal */
.flag-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.flag-modal { background: white; border-radius: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; position: relative; }
.flag-modal .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; border: none; background: #F1F5F9; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; }

.flag-modal-header { display: flex; align-items: center; gap: 12px; padding: 24px 24px 16px; border-bottom: 1px solid #E2E8F0; }
.flag-modal-header svg { width: 28px; height: 28px; color: #DC2626; }
.flag-modal-header h3 { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0; }

.flag-modal-info { padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.flag-modal-info p { margin: 0 0 8px; font-size: 14px; color: #475569; }
.flag-modal-info .review-preview { font-style: italic; color: #64748B; margin: 0; }

.flag-modal-form { padding: 20px 24px; }
.flag-modal-form > label { display: block; font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 12px; }

.reason-options { display: flex; flex-direction: column; gap: 8px; }
.reason-option { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 2px solid #E2E8F0; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.reason-option:hover { border-color: #CBD5E1; }
.reason-option.selected { border-color: #DC2626; background: #FEF2F2; }
.reason-option input { display: none; }
.reason-option span { font-size: 14px; color: #334155; }

.flag-modal-warning { display: flex; gap: 12px; padding: 16px 24px; background: #FFF7ED; border-top: 1px solid #FFEDD5; }
.flag-modal-warning svg { width: 20px; height: 20px; color: #EA580C; flex-shrink: 0; margin-top: 2px; }
.flag-modal-warning span { font-size: 13px; color: #9A3412; line-height: 1.5; }

.flag-modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #E2E8F0; background: #F8FAFC; border-radius: 0 0 20px 20px; }
.flag-modal-actions .btn-cancel { padding: 12px 24px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; color: #64748B; }
.flag-modal-actions .btn-flag { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #DC2626; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; }
.flag-modal-actions .btn-flag svg { width: 16px; height: 16px; }
.flag-modal-actions .btn-flag:hover { background: #B91C1C; }
.flag-modal-actions .btn-flag:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
