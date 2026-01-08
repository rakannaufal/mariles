<script setup>
import { ref, computed, onMounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import { useRoute } from 'vue-router'
import { useTeacherData } from '@/composables/useTeacherData'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))

const { 
  loading, 
  materials, 
  programs,
  fetchTeacherMaterials, 
  fetchTeacherSchedule,
  createMaterial, 
  deleteMaterial 
} = useTeacherData()

// Active tab
const activeTab = ref('materials') // 'materials', 'exercises', 'videos'

// Search and filter
const searchQuery = ref('')
const selectedProgram = ref('all')

// Modal
const showUploadModal = ref(false)
const uploadingFile = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref(null)
const newMaterial = ref({
  title: '',
  program_id: '',
  description: '',
  type: 'module',
  exercise_type: 'latihan', // latihan, ulangan_harian, kuis, tugas
  deadline: '',
  duration_minutes: 0,
  content: '',
  video_url: ''
})

// Exercise types
const exerciseTypes = [
  { id: 'latihan', name: 'Latihan', hasDeadline: false },
  { id: 'ulangan_harian', name: 'Ulangan Harian', hasDeadline: true },
  { id: 'kuis', name: 'Kuis', hasDeadline: true },
  { id: 'tugas', name: 'Tugas', hasDeadline: true }
]

// Get programs for dropdown
const programOptions = computed(() => {
  return programs.value.map(p => ({
    id: p.id,
    name: `${p.name || p.subject} - ${p.level || 'Umum'}`
  }))
})

// Filter materials by type
const materialsList = computed(() => {
  return materials.value.filter(m => m.type === 'module' || m.type === 'PDF' || m.type === 'DOC')
})

const exercisesList = computed(() => {
  return materials.value.filter(m => m.type === 'exercise' || m.type === 'quiz')
})

const videosList = computed(() => {
  return materials.value.filter(m => m.type === 'video')
})

// Current list based on tab
const currentList = computed(() => {
  let list = []
  if (activeTab.value === 'materials') list = materialsList.value
  else if (activeTab.value === 'exercises') list = exercisesList.value
  else if (activeTab.value === 'videos') list = videosList.value
  
  // Apply search
  if (searchQuery.value) {
    list = list.filter(m => 
      m.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  // Apply program filter
  if (selectedProgram.value !== 'all') {
    list = list.filter(m => m.program_id === selectedProgram.value)
  }
  
  return list
})

// Stats
const stats = computed(() => ({
  totalMaterials: materialsList.value.length,
  totalExercises: exercisesList.value.length,
  totalVideos: videosList.value.length,
  totalAll: materials.value.length
}))

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDeadline(deadline) {
  if (!deadline) return ''
  return new Date(deadline).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getExerciseTypeName(type) {
  const types = {
    'latihan': 'Latihan',
    'ulangan_harian': 'Ulangan Harian',
    'kuis': 'Kuis',
    'tugas': 'Tugas'
  }
  return types[type] || 'Latihan'
}

function getExerciseTypeClass(type) {
  const classes = {
    'latihan': 'green',
    'ulangan_harian': 'orange',
    'kuis': 'purple',
    'tugas': 'blue'
  }
  return classes[type] || 'green'
}

// Get YouTube thumbnail from URL
function getYouTubeThumbnail(url) {
  if (!url) return null
  
  // Extract YouTube video ID
  let videoId = null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      videoId = match[1]
      break
    }
  }
  
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  }
  return null
}

// Open video in new tab
function playVideo(videoUrl) {
  if (videoUrl) {
    window.open(videoUrl, '_blank')
  } else {
    showErrorToast('URL video tidak tersedia')
  }
}

function openUploadModal(type) {
  newMaterial.value.type = type === 'materials' ? 'module' : type === 'exercises' ? 'exercise' : 'video'
  selectedFile.value = null
  showUploadModal.value = true
}

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
  }
}

async function uploadFile(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `materials/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    console.error('Upload error:', error)
    throw error
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('course-materials')
    .getPublicUrl(filePath)
  
  return urlData.publicUrl
}

// Toast notification
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

function showSuccessToast(message) {
  toastMessage.value = message
  toastType.value = 'success'
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 4000)
}

function showErrorToast(message) {
  toastMessage.value = message
  toastType.value = 'error'
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 4000)
}

async function handleUpload() {
  if (!newMaterial.value.title || !newMaterial.value.program_id) {
    showErrorToast('Judul dan Program harus diisi!')
    return
  }
  
  try {
    uploadingFile.value = true
    uploadProgress.value = 0
    
    let fileUrl = newMaterial.value.content
    
    // Upload file if selected (for materials and exercises)
    if (selectedFile.value && newMaterial.value.type !== 'video') {
      uploadProgress.value = 30
      fileUrl = await uploadFile(selectedFile.value)
      uploadProgress.value = 80
    }
    
    const uploadedType = newMaterial.value.type
    
    const success = await createMaterial({
      title: newMaterial.value.title,
      program_id: newMaterial.value.program_id,
      description: newMaterial.value.description,
      type: newMaterial.value.type,
      exercise_type: newMaterial.value.exercise_type,
      deadline: newMaterial.value.deadline || null,
      duration_minutes: newMaterial.value.duration_minutes || null,
      content: fileUrl,
      video_url: newMaterial.value.video_url
    })
    
    uploadProgress.value = 100
    
    if (success) {
      showUploadModal.value = false
      selectedFile.value = null
      newMaterial.value = { 
        title: '', 
        program_id: '', 
        description: '', 
        type: 'module', 
        exercise_type: 'latihan',
        deadline: '',
        duration_minutes: 0,
        content: '', 
        video_url: '' 
      }
      
      // Refresh the list to show new material
      await fetchTeacherMaterials()
      
      // Switch to relevant tab
      if (uploadedType === 'module' || uploadedType === 'PDF' || uploadedType === 'DOC') {
        activeTab.value = 'materials'
      } else if (uploadedType === 'exercise' || uploadedType === 'quiz') {
        activeTab.value = 'exercises'
      } else if (uploadedType === 'video') {
        activeTab.value = 'videos'
      }
      
      // Show success toast
      const typeName = uploadedType === 'module' ? 'Materi' : uploadedType === 'exercise' ? 'Latihan' : 'Video'
      showSuccessToast(`${typeName} berhasil diupload! ✓`)
    }
  } catch (error) {
    console.error('Error uploading:', error)
    showErrorToast('Gagal mengupload file. Pastikan bucket storage sudah dikonfigurasi.')
  } finally {
    uploadingFile.value = false
    uploadProgress.value = 0
  }
}

async function handleDelete(materialId) {
  if (confirm('Apakah Anda yakin ingin menghapus ini?')) {
    const success = await deleteMaterial(materialId)
    if (success) {
      await fetchTeacherMaterials()
      showSuccessToast('Berhasil dihapus!')
    } else {
      showErrorToast('Gagal menghapus.')
    }
  }
}

// View content
function viewContent(item) {
  if (item.content) {
    window.open(item.content, '_blank')
  } else if (item.video_url) {
    window.open(item.video_url, '_blank')
  } else {
    showErrorToast('Tidak ada konten untuk ditampilkan')
  }
}

// Edit modal
const showEditModal = ref(false)
const editingMaterial = ref(null)

function openEditModal(item) {
  editingMaterial.value = { ...item }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editingMaterial.value) return
  
  try {
    const { error } = await supabase
      .from('course_materials')
      .update({
        title: editingMaterial.value.title,
        description: editingMaterial.value.description
      })
      .eq('id', editingMaterial.value.id)
    
    if (error) throw error
    
    showEditModal.value = false
    await fetchTeacherMaterials()
    showSuccessToast('Berhasil diperbarui!')
  } catch (err) {
    console.error('Error updating:', err)
    showErrorToast('Gagal memperbarui.')
  }
}

onMounted(async () => {
  await fetchTeacherSchedule()
  await fetchTeacherMaterials()
})
</script>

<template>
  <div class="dashboard">

    <!-- Toast Notification -->
    <Transition name="fade">
      <div v-if="showToast" :class="['toast', toastType]">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ toastMessage }}</span>
        <button @click="showToast = false">×</button>
      </div>
    </Transition>

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Materi Pembelajaran
          </h1>
          <p class="subtitle">Kelola materi, latihan, dan video pembelajaran untuk siswa</p>
        </div>
        <button class="btn-add" @click="openUploadModal(activeTab)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah {{ activeTab === 'materials' ? 'Materi' : activeTab === 'exercises' ? 'Latihan' : 'Video' }}
        </button>
      </header>

      <!-- Stats Cards -->
      <section class="stats-grid">
        <StatCard 
            label="Materi/Modul" 
            :value="stats.totalMaterials" 
            icon-color="blue"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Latihan/Kuis" 
            :value="stats.totalExercises" 
            icon-color="green"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Video" 
            :value="stats.totalVideos" 
            icon-color="purple"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Total Konten" 
            :value="stats.totalAll" 
            icon-color="orange"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </template>
        </StatCard>
      </section>

      <!-- Tabs -->
      <section class="tabs-section">
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'materials' }]" @click="activeTab = 'materials'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Materi
            <span class="tab-count">{{ stats.totalMaterials }}</span>
          </button>
          <button :class="['tab', { active: activeTab === 'exercises' }]" @click="activeTab = 'exercises'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Latihan
            <span class="tab-count">{{ stats.totalExercises }}</span>
          </button>
          <button :class="['tab', { active: activeTab === 'videos' }]" @click="activeTab = 'videos'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Video
            <span class="tab-count">{{ stats.totalVideos }}</span>
          </button>
        </div>
      </section>

      <!-- Filter Bar -->
      <section class="filter-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" :placeholder="'Cari ' + (activeTab === 'materials' ? 'materi' : activeTab === 'exercises' ? 'latihan' : 'video') + '...'">
        </div>
        <select v-model="selectedProgram" class="filter-select">
          <option value="all">Semua Program</option>
          <option v-for="prog in programOptions" :key="prog.id" :value="prog.id">{{ prog.name }}</option>
        </select>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Memuat konten...</p>
      </div>

      <!-- Materials Section -->
      <section v-else-if="activeTab === 'materials'" class="content-section">
        <div v-if="currentList.length > 0" class="content-grid">
          <div v-for="item in currentList" :key="item.id" class="content-card material-card">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="card-content">
              <h3>{{ item.title }}</h3>
              <p class="card-meta">{{ item.subject }} • {{ item.class }}</p>
              <div class="card-footer">
                <span class="badge">PDF</span>
                <span class="date" v-if="formatDate(item.date)">{{ formatDate(item.date) }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-icon view" title="Lihat" @click="viewContent(item)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-icon edit" title="Edit" @click="openEditModal(item)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon delete" title="Hapus" @click="handleDelete(item.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3>Belum ada materi</h3>
          <p>Klik tombol "Tambah Materi" untuk menambahkan materi pembelajaran baru</p>
        </div>
      </section>

      <!-- Exercises Section -->
      <section v-else-if="activeTab === 'exercises'" class="content-section">
        <div v-if="currentList.length > 0" class="content-grid">
          <div v-for="item in currentList" :key="item.id" class="content-card exercise-card">
            <div class="card-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div class="card-content">
              <h3>{{ item.title }}</h3>
              <p class="card-meta">{{ item.subject }} • {{ item.class }}</p>
              
              <!-- Exercise Type Badge -->
              <div class="card-footer">
                <span class="badge" :class="getExerciseTypeClass(item.exercise_type)">
                  {{ getExerciseTypeName(item.exercise_type) }}
                </span>
                <span class="date" v-if="formatDate(item.date)">{{ formatDate(item.date) }}</span>
              </div>
              
              <!-- Deadline Info -->
              <div v-if="item.deadline" class="deadline-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Deadline: {{ formatDeadline(item.deadline) }}</span>
                <span v-if="item.duration_minutes" class="duration">• {{ item.duration_minutes }} menit</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-icon view" title="Lihat" @click="viewContent(item)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-icon edit" title="Edit" @click="openEditModal(item)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon delete" title="Hapus" @click="handleDelete(item.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3>Belum ada latihan</h3>
          <p>Klik tombol "Tambah Latihan" untuk menambahkan latihan atau kuis baru</p>
        </div>
      </section>

      <!-- Videos Section -->
      <section v-else-if="activeTab === 'videos'" class="content-section">
        <div v-if="currentList.length > 0" class="content-grid videos-grid">
          <div v-for="item in currentList" :key="item.id" class="content-card video-card">
            <div class="video-thumbnail" @click="playVideo(item.video_url)">
              <img v-if="getYouTubeThumbnail(item.video_url)" 
                   :src="getYouTubeThumbnail(item.video_url)" 
                   :alt="item.title">
              <div class="play-overlay">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
            </div>
            <div class="card-content">
              <h3>{{ item.title }}</h3>
              <p class="card-meta">{{ item.subject }} • {{ item.class }}</p>
              <div class="card-footer">
                <span class="badge purple">Video</span>
                <span class="date" v-if="formatDate(item.date)">{{ formatDate(item.date) }}</span>
              </div>
            </div>
            <div class="card-actions video-actions">
              <button class="btn-icon play" title="Putar Video" @click="playVideo(item.video_url)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
              <button class="btn-icon delete" title="Hapus" @click="handleDelete(item.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <h3>Belum ada video</h3>
          <p>Klik tombol "Tambah Video" untuk menambahkan video pembelajaran baru</p>
        </div>
      </section>

      <!-- Upload Modal -->
      <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
        <div class="modal">
          <button class="modal-close" @click="showUploadModal = false">×</button>
          <h2>Tambah {{ newMaterial.type === 'module' ? 'Materi' : newMaterial.type === 'exercise' ? 'Latihan' : 'Video' }} Baru</h2>
          
          <form @submit.prevent="handleUpload">
            <div class="form-group">
              <label>Judul</label>
              <input v-model="newMaterial.title" type="text" placeholder="Masukkan judul..." required>
            </div>
            
            <div class="form-group">
              <label>Program</label>
              <select v-model="newMaterial.program_id" required>
                <option value="">Pilih Program</option>
                <option v-for="prog in programOptions" :key="prog.id" :value="prog.id">{{ prog.name }}</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Deskripsi</label>
              <textarea v-model="newMaterial.description" placeholder="Deskripsi singkat..." rows="3"></textarea>
            </div>
            
            <!-- Exercise Type (only for exercises) -->
            <div class="form-group" v-if="newMaterial.type === 'exercise'">
              <label>Jenis Latihan</label>
              <div class="exercise-types">
                <button v-for="et in exerciseTypes" :key="et.id" type="button"
                        :class="['exercise-type-btn', { active: newMaterial.exercise_type === et.id }]"
                        @click="newMaterial.exercise_type = et.id">
                  {{ et.name }}
                </button>
              </div>
            </div>
            
            <!-- Deadline (for ulangan harian, kuis, tugas) -->
            <div class="form-group" v-if="newMaterial.type === 'exercise' && exerciseTypes.find(e => e.id === newMaterial.exercise_type)?.hasDeadline">
              <label>Batas Waktu Pengerjaan</label>
              <div class="deadline-inputs">
                <div class="deadline-field">
                  <label>Deadline</label>
                  <input type="datetime-local" v-model="newMaterial.deadline">
                </div>
                <div class="deadline-field">
                  <label>Durasi (menit)</label>
                  <input type="number" v-model.number="newMaterial.duration_minutes" min="0" placeholder="60">
                </div>
              </div>
              <p class="hint-text">* Waktu pengerjaan dimulai saat siswa membuka latihan</p>
            </div>
            
            <div class="form-group" v-if="newMaterial.type === 'video'">
              <label>URL Video (YouTube/Lainnya)</label>
              <input v-model="newMaterial.video_url" type="url" placeholder="https://youtube.com/...">
            </div>
            
            <div class="form-group" v-else>
              <label>Upload File (PDF, DOC, PPT, dll)</label>
              <div class="file-upload-zone" :class="{ 'has-file': selectedFile }">
                <input type="file" @change="handleFileSelect" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt">
                <div class="upload-placeholder" v-if="!selectedFile">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span>Klik atau drag file kesini</span>
                  <small>PDF, DOC, PPT, XLS (max 10MB)</small>
                </div>
                <div class="selected-file" v-else>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span>{{ selectedFile.name }}</span>
                  <small>{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</small>
                </div>
              </div>
              <p class="helper-text">Atau masukkan link file:</p>
              <input v-model="newMaterial.content" type="url" placeholder="https://drive.google.com/...">
            </div>
            
            <!-- Upload Progress -->
            <div class="upload-progress" v-if="uploadingFile">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <span>{{ uploadProgress < 100 ? 'Mengupload...' : 'Selesai!' }} {{ uploadProgress }}%</span>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="showUploadModal = false" :disabled="uploadingFile">Batal</button>
              <button type="submit" class="btn-submit">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal">
          <button class="modal-close" @click="showEditModal = false">×</button>
          <h2>Edit {{ editingMaterial?.type === 'exercise' ? 'Latihan' : 'Materi' }}</h2>
          
          <form @submit.prevent="handleEdit">
            <div class="form-group">
              <label>Judul</label>
              <input v-model="editingMaterial.title" type="text" required>
            </div>
            
            <div class="form-group">
              <label>Deskripsi</label>
              <textarea v-model="editingMaterial.description" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" @click="showEditModal = false">Batal</button>
              <button type="submit" class="btn-submit">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.main {
  flex: 1;
  padding: 32px;
  width: 100%;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.header-left h1 svg {
  width: 28px;
  height: 28px;
  color: #0d5782;
}

.subtitle {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover { background: #0a4568; }
.btn-add svg { width: 18px; height: 18px; }

/* Toast Notification */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 280px;
}

.toast.success {
  border-left: 4px solid #22c55e;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.toast.success svg { color: #22c55e; }
.toast.error svg { color: #ef4444; }

.toast span {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.toast button {
  width: 28px;
  height: 28px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  font-size: 18px;
  color: #64748b;
  cursor: pointer;
}

.toast button:hover { background: #e2e8f0; }

/* Toast Animation */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Stats Cards - Compact Inline */
.stats-grid { 
  display: grid;
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 24px; 
  width: 100%;
}
/* StatCard styling handled by component */

/* Tabs */
.tabs-section {
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: 8px;
  background: white;
  padding: 6px;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover { background: #f8fafc; color: #1e293b; }

.tab.active {
  background: #0d5782;
  color: white;
}

.tab svg { width: 18px; height: 18px; }

.tab-count {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: rgba(0,0,0,0.1);
}

.tab.active .tab-count {
  background: rgba(255,255,255,0.2);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-box input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
}

.search-box input:focus {
  outline: none;
  border-color: #0d5782;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  min-width: 180px;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.videos-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/* Content Cards */
.content-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}

.content-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #dbeafe;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg { width: 22px; height: 22px; }

.card-icon.green { background: #dcfce7; color: #16a34a; }

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  padding: 4px 10px;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.badge.green { background: #dcfce7; color: #16a34a; }
.badge.purple { background: #f3e8ff; color: #9333ea; }
.badge.orange { background: #fed7aa; color: #ea580c; }
.badge.blue { background: #dbeafe; color: #2563eb; }

.date {
  font-size: 12px;
  color: #94a3b8;
}

/* Deadline Info */
.deadline-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.deadline-info svg { width: 14px; height: 14px; }
.deadline-info .duration { font-weight: 600; }

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon svg { width: 16px; height: 16px; color: #64748b; }

.btn-icon.view:hover { background: #dcfce7; border-color: #16a34a; }
.btn-icon.view:hover svg { color: #16a34a; }

.btn-icon.edit:hover { background: #dbeafe; border-color: #2563eb; }
.btn-icon.edit:hover svg { color: #2563eb; }

.btn-icon.delete:hover { background: #fee2e2; border-color: #ef4444; }
.btn-icon.delete:hover svg { color: #ef4444; }

.btn-icon.play:hover { background: #f3e8ff; border-color: #9333ea; }
.btn-icon.play:hover svg { color: #9333ea; }

/* Video Card */
.video-card {
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s;
}

.video-thumbnail:hover .play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-overlay svg {
  width: 48px;
  height: 48px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.video-card .card-content {
  padding: 16px;
}

.video-card .video-actions {
  flex-direction: row;
  padding: 0 16px 16px;
  gap: 8px;
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px;
  text-align: center;
  border: 2px dashed #e2e8f0;
}

.empty-state svg {
  width: 80px;
  height: 80px;
  color: #cbd5e1;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.empty-state p {
  font-size: 14px;
  color: #64748b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
}

.modal-close:hover { background: #e2e8f0; }

.modal h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0d5782;
}

/* Exercise Types */
.exercise-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.exercise-type-btn {
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.exercise-type-btn:hover { border-color: #0d5782; color: #0d5782; }

.exercise-type-btn.active {
  background: #0d5782;
  border-color: #0d5782;
  color: white;
}

/* Deadline Inputs */
.deadline-inputs {
  display: flex;
  gap: 16px;
}

.deadline-field {
  flex: 1;
}

.deadline-field label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.deadline-field input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.deadline-field input:focus { outline: none; border-color: #0d5782; }

.hint-text {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 8px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-submit {
  flex: 2;
  padding: 12px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover { background: #0a4568; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* File Upload Zone */
.file-upload-zone {
  position: relative;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.file-upload-zone:hover { border-color: #0d5782; background: #f8fafc; }

.file-upload-zone.has-file { border-color: #22c55e; background: #f0fdf4; }

.file-upload-zone input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.upload-placeholder svg { width: 40px; height: 40px; color: #94a3b8; }
.upload-placeholder span { font-weight: 600; }
.upload-placeholder small { font-size: 12px; color: #94a3b8; }

.selected-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #16a34a;
}

.selected-file svg { width: 36px; height: 36px; }
.selected-file span { font-weight: 600; }
.selected-file small { font-size: 12px; color: #22c55e; }

.helper-text {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

/* Upload Progress */
.upload-progress {
  margin-bottom: 16px;
}

.upload-progress .progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.upload-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0d5782, #22c55e);
  transition: width 0.3s ease;
}

.upload-progress span {
  font-size: 12px;
  color: #64748b;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
  .tabs { flex-direction: column; }
  .filter-bar { flex-direction: column; }
  .search-box { max-width: 100%; }
  .content-grid { grid-template-columns: 1fr; }
}
</style>
@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr; } }
