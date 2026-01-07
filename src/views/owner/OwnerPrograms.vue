<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { levelOptions, getLevelLabel, getLevelColor } from '@/utils/badgeUtils'

const authStore = useAuthStore()
const programs = ref([])
const categories = ref([])
const lesPlace = ref(null)
const owner = ref(null)
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingProgram = ref(null)
const message = ref({ type: '', text: '' })
const customCategory = ref('')
const showCustomCategory = ref(false)
const categorySearch = ref('')
const showCategoryDropdown = ref(false)

// Daftar kategori akademik lengkap (SD-SMA, Kuliah)
const academicCategories = [
  // Mata Pelajaran Umum (SD-SMA)
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'IPA',
  'IPS',
  'Fisika',
  'Kimia',
  'Biologi',
  'Ekonomi',
  'Geografi',
  'Sosiologi',
  'Sejarah',
  'PKN',
  'Agama Islam',
  'Agama Kristen',
  'Agama Katolik',
  'Agama Hindu',
  'Agama Buddha',
  'Seni Budaya',
  'Prakarya',
  'PJOK',
  'TIK/Informatika',
  // Bahasa Asing
  'Bahasa Mandarin',
  'Bahasa Jepang',
  'Bahasa Korea',
  'Bahasa Jerman',
  'Bahasa Prancis',
  'Bahasa Arab',
  // Persiapan Ujian
  'UTBK/SBMPTN',
  'TOEFL',
  'IELTS',
  'SAT',
  // Mata Kuliah Umum
  'Kalkulus',
  'Statistika',
  'Fisika Dasar',
  'Kimia Dasar',
  'Biologi Umum',
  'Akuntansi',
  'Manajemen',
  'Ekonomi Mikro',
  'Ekonomi Makro',
  'Hukum',
  'Psikologi',
  'Sosiologi Umum',
  'Filsafat',
  // Teknik & Sains
  'Pemrograman',
  'Algoritma',
  'Struktur Data',
  'Basis Data',
  'Jaringan Komputer',
  'Matematika Teknik',
  'Mekanika',
  'Termodinamika',
  'Elektronika',
  // Kesehatan
  'Anatomi',
  'Fisiologi',
  'Farmakologi',
  'Biokimia',
  // Bisnis & Ekonomi
  'Akuntansi Dasar',
  'Akuntansi Keuangan',
  'Manajemen Keuangan',
  'Manajemen Pemasaran',
  'Manajemen SDM',
  'Perpajakan',
  // Bahasa & Komunikasi
  'Bahasa Inggris Akademik',
  'Public Speaking',
  'Academic Writing',
  // Lainnya Akademik
  'Calistung',
  'Mengaji/Iqra',
  'Olimpiade Matematika',
  'Olimpiade Fisika',
  'Olimpiade Kimia',
  'Olimpiade Biologi',
  'Olimpiade Informatika'
]

// Filtered categories based on search
const filteredCategories = computed(() => {
  const search = categorySearch.value.toLowerCase()
  if (!search) return academicCategories
  return academicCategories.filter(cat => cat.toLowerCase().includes(search))
})

// Form data
const form = ref({
  name: '',
  description: '',
  level: '',
  category_id: '',
  category_name: '', // untuk custom category
  class_type: '', // online or offline - auto-set for non-Hybrid, choosable for Hybrid
  duration_months: 0,
  sessions_per_week: 0,
  session_duration_minutes: 0,
  total_modules: 0,
  total_videos: 0,
  total_exercises: 0,
  capacity: 0,
  price: 0,
  price_type: 'package',
  schedule: {},
  is_active: true
})

// Check if les place is Hybrid (owner needs to choose class_type per program)
const isHybridLesPlace = computed(() => {
  const type = lesPlace.value?.type
  return type && ['Hybrid', 'hybrid'].includes(type)
})

// Get auto class_type for non-Hybrid les places
const autoClassType = computed(() => {
  const type = lesPlace.value?.type
  if (!type) return 'offline'
  if (['Online', 'online'].includes(type)) return 'online'
  if (['Offline', 'offline'].includes(type)) return 'offline'
  return 'offline' // fallback
})

// Schedule form
const scheduleForm = ref({
  monday: { enabled: false, start: '09:00', end: '11:00' },
  tuesday: { enabled: false, start: '09:00', end: '11:00' },
  wednesday: { enabled: false, start: '09:00', end: '11:00' },
  thursday: { enabled: false, start: '09:00', end: '11:00' },
  friday: { enabled: false, start: '09:00', end: '11:00' },
  saturday: { enabled: false, start: '09:00', end: '11:00' },
  sunday: { enabled: false, start: '09:00', end: '11:00' }
})

const dayLabels = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu'
}

const priceTypeOptions = [
  { value: 'hourly', label: 'Per Jam' },
  { value: 'daily', label: 'Per Hari' },
  { value: 'weekly', label: 'Per Minggu' },
  { value: 'monthly', label: 'Per Bulan' },
  { value: 'package', label: 'Per Paket' }
]

// Computed values
const totalSessions = computed(() => {
  return form.value.duration_months * form.value.sessions_per_week * 4
})

const availableSlots = computed(() => {
  if (!editingProgram.value) return form.value.capacity
  const current = editingProgram.value.current_students || 0
  return form.value.capacity - current
})

// Click outside handler untuk tutup dropdown
function handleClickOutside(e) {
  const categoryGroup = document.querySelector('.category-group')
  if (categoryGroup && !categoryGroup.contains(e.target)) {
    showCategoryDropdown.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await fetchOwnerAndLesPlace()
  await fetchCategories()
  await fetchPrograms()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

async function fetchOwnerAndLesPlace() {
  try {
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (ownerData) {
      owner.value = ownerData
      
      const { data: lesData } = await supabase
        .from('les_places')
        .select('id, name, type')
        .eq('owner_id', ownerData.id)
        .single()
      
      lesPlace.value = lesData
    }
  } catch (err) {
    console.error('Error fetching owner:', err)
  }
}

async function fetchCategories() {
  try {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    
    categories.value = data || []
  } catch (err) {
    console.error('Error fetching categories:', err)
  }
}

async function fetchPrograms() {
  loading.value = true
  try {
    if (!owner.value) return

    const { data } = await supabase
      .from('programs')
      .select('*, les_places!inner(id, name, owner_id), categories(id, name)')
      .eq('les_places.owner_id', owner.value.id)
      .order('created_at', { ascending: false })

    // Hitung jumlah siswa aktif per program dari bookings
    if (data && data.length > 0) {
      const programIds = data.map(p => p.id)
      
      // Query bookings dengan status confirmed/active dan payment sudah paid
      const { data: bookingCounts } = await supabase
        .from('bookings')
        .select('program_id')
        .in('program_id', programIds)
        .in('status', ['confirmed', 'active'])
        .in('payment_status', ['paid', 'settlement', 'capture'])
      
      // Count bookings per program
      const countMap = {}
      if (bookingCounts) {
        bookingCounts.forEach(b => {
          countMap[b.program_id] = (countMap[b.program_id] || 0) + 1
        })
      }
      
      // Attach counts to programs
      data.forEach(p => {
        p.current_students = countMap[p.id] || 0
      })
    }

    programs.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingProgram.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(program) {
  editingProgram.value = program
  
  // Get category name from relation or category_name field
  const catName = program.categories?.name || program.category_name || ''
  
  form.value = {
    name: program.name || '',
    description: program.description || '',
    level: program.level || '',
    category_id: program.category_id || '',
    category_name: catName,
    class_type: program.class_type || (isHybridLesPlace.value ? '' : autoClassType.value),
    duration_months: program.duration_months || 3,
    sessions_per_week: program.sessions_per_week || 4,
    session_duration_minutes: program.session_duration_minutes || 120,
    total_modules: program.total_modules || 0,
    total_videos: program.total_videos || 0,
    total_exercises: program.total_exercises || 0,
    capacity: program.capacity || 10,
    price: program.price || 0,
    price_type: program.price_type || 'package',
    schedule: program.schedule || {},
    is_active: program.is_active !== false
  }
  
  // Set category search field
  categorySearch.value = catName
  showCategoryDropdown.value = false
  
  // Load schedule into form
  Object.keys(scheduleForm.value).forEach(day => {
    if (program.schedule && program.schedule[day]) {
      scheduleForm.value[day] = {
        enabled: true,
        start: program.schedule[day].start || '09:00',
        end: program.schedule[day].end || '11:00'
      }
    } else {
      scheduleForm.value[day] = { enabled: false, start: '09:00', end: '11:00' }
    }
  })
  
  showModal.value = true
}

function resetForm() {
  // Auto-determine class_type based on les place type
  const classType = isHybridLesPlace.value ? '' : autoClassType.value
  
  form.value = {
    name: '',
    description: '',
    level: '',
    category_id: '',
    category_name: '',
    class_type: classType,
    duration_months: 0,
    sessions_per_week: 0,
    session_duration_minutes: 0,
    total_modules: 0,
    total_videos: 0,
    total_exercises: 0,
    capacity: 0,
    price: 0,
    price_type: 'package',
    schedule: {},
    is_active: true
  }
  
  categorySearch.value = ''
  showCategoryDropdown.value = false
  showCustomCategory.value = false
  customCategory.value = ''
  
  Object.keys(scheduleForm.value).forEach(day => {
    scheduleForm.value[day] = { enabled: false, start: '09:00', end: '11:00' }
  })
}

function selectCategory(catName) {
  form.value.category_name = catName
  categorySearch.value = catName
  showCategoryDropdown.value = false
}

function useCustomCategory() {
  if (categorySearch.value.trim()) {
    form.value.category_name = categorySearch.value.trim()
    showCategoryDropdown.value = false
  }
}

function buildSchedule() {
  const schedule = {}
  Object.entries(scheduleForm.value).forEach(([day, data]) => {
    if (data.enabled) {
      schedule[day] = { start: data.start, end: data.end }
    }
  })
  return schedule
}

async function saveProgram() {
  if (!lesPlace.value?.id || !form.value.name) return
  
  saving.value = true
  message.value = { type: '', text: '' }
  
  try {
    // Cari category_id dari nama kategori yang dipilih
    let categoryId = null
    if (form.value.category_name) {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', form.value.category_name)
        .single()
      
      if (catData) {
        categoryId = catData.id
      }
    }
    
    const programData = {
      les_place_id: lesPlace.value.id,
      name: form.value.name,
      description: form.value.description,
      level: form.value.level,
      category_id: categoryId, // gunakan category_id hasil lookup
      duration_months: form.value.duration_months,
      sessions_per_week: form.value.sessions_per_week,
      session_duration_minutes: form.value.session_duration_minutes,
      total_sessions: totalSessions.value,
      total_modules: form.value.total_modules,
      total_videos: form.value.total_videos,
      total_exercises: form.value.total_exercises,
      capacity: form.value.capacity,
      price: form.value.price,
      price_type: form.value.price_type,
      schedule: buildSchedule(),
      is_active: form.value.is_active,
      class_type: isHybridLesPlace.value ? form.value.class_type : autoClassType.value
    }
    
    let error
    if (editingProgram.value) {
      const result = await supabase
        .from('programs')
        .update(programData)
        .eq('id', editingProgram.value.id)
      error = result.error
    } else {
      const result = await supabase
        .from('programs')
        .insert(programData)
      error = result.error
    }
    
    if (error) throw error
    
    message.value = { type: 'success', text: editingProgram.value ? 'Program berhasil diperbarui!' : 'Program berhasil ditambahkan!' }
    showModal.value = false
    await fetchPrograms()
  } catch (err) {
    console.error('Error saving:', err)
    message.value = { type: 'error', text: 'Gagal menyimpan program: ' + err.message }
  } finally {
    saving.value = false
  }
}

async function deleteProgram(program) {
  if (!confirm(`Hapus program "${program.name}"?`)) return
  
  try {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', program.id)
    
    if (error) throw error
    
    message.value = { type: 'success', text: 'Program berhasil dihapus!' }
    await fetchPrograms()
  } catch (err) {
    console.error('Error deleting:', err)
    message.value = { type: 'error', text: 'Gagal menghapus program: ' + err.message }
  }
}

async function toggleActive(program) {
  try {
    const { error } = await supabase
      .from('programs')
      .update({ is_active: !program.is_active })
      .eq('id', program.id)
    
    if (error) throw error
    await fetchPrograms()
  } catch (err) {
    console.error('Error toggling:', err)
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price)
}

function getPriceTypeLabel(type) {
  return priceTypeOptions.find(t => t.value === type)?.label || type
}

function getScheduleDays(schedule) {
  if (!schedule) return []
  return Object.entries(schedule)
    .filter(([_, data]) => data.start && data.end)
    .map(([day, data]) => ({
      day: dayLabels[day] || day,
      time: `${data.start}-${data.end}`
    }))
}
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <div class="header-left">
          <h1>Kelola Program</h1>
          <p class="header-desc" v-if="lesPlace">{{ lesPlace.name }}</p>
        </div>
        <button class="btn btn-primary" @click="openAddModal" :disabled="!lesPlace">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Program
        </button>
      </header>

      <!-- Message Alert -->
      <div v-if="message.text" :class="['alert', `alert-${message.type}`]">
        {{ message.text }}
        <button class="alert-close" @click="message.text = ''">&times;</button>
      </div>

      <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

      <div v-else-if="!lesPlace" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <h3>Tempat Les Belum Ada</h3>
        <p>Buat tempat les terlebih dahulu sebelum menambahkan program.</p>
        <router-link to="/owner/les" class="btn btn-primary">Kelola Tempat Les</router-link>
      </div>

      <div v-else-if="programs.length" class="programs-grid">
        <div v-for="prog in programs" :key="prog.id" class="program-card" :class="{ inactive: !prog.is_active }">
          <div class="program-header">
            <div class="program-title">
              <h3>{{ prog.name }}</h3>
              <span class="level-badge" :style="{ backgroundColor: getLevelColor(prog.level) }">
                {{ getLevelLabel(prog.level) }}
              </span>
            </div>
            <div class="program-actions">
              <button class="action-btn" @click="toggleActive(prog)" :title="prog.is_active ? 'Nonaktifkan' : 'Aktifkan'">
                <svg v-if="prog.is_active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
              <button class="action-btn" @click="openEditModal(prog)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn danger" @click="deleteProgram(prog)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          
          <p class="program-desc">{{ prog.description || 'Tidak ada deskripsi' }}</p>
          
          <div class="program-stats">
            <div class="stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{{ prog.duration_months || 0 }} bulan</span>
            </div>
            <div class="stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{{ prog.sessions_per_week || 0 }}x/minggu</span>
            </div>
            <div class="stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>{{ prog.current_students || 0 }}/{{ prog.capacity || 0 }}</span>
            </div>
          </div>

          <div class="program-schedule" v-if="prog.schedule && Object.keys(prog.schedule).length">
            <div class="schedule-title">Jadwal Kelas</div>
            <div class="schedule-list">
              <div v-for="item in getScheduleDays(prog.schedule)" :key="item.day" class="schedule-item">
                <span class="schedule-day">{{ item.day }}</span>
                <span class="schedule-time">{{ item.time }}</span>
              </div>
            </div>
          </div>

          <div class="program-footer">
            <div class="price-tag">
              <span class="price-label">Biaya</span>
              <span class="price-value">{{ formatPrice(prog.price) }}<small>/{{ getPriceTypeLabel(prog.price_type) }}</small></span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h3>Belum ada program</h3>
        <p>Tambahkan program les pertama Anda untuk mulai menerima siswa.</p>
        <button class="btn btn-primary" @click="openAddModal">Tambah Program</button>
      </div>
    </main>

    <!-- Modal Add/Edit Program -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingProgram ? 'Edit Program' : 'Tambah Program Baru' }}</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Basic Info -->
          <div class="form-section">
            <h3 class="section-title">Informasi Dasar</h3>
            
            <div class="form-group">
              <label class="form-label">Nama Program <span class="required">*</span></label>
              <input v-model="form.name" type="text" class="form-input" placeholder="Contoh: TOEFL Preparation">
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <textarea v-model="form.description" class="form-input" rows="3" placeholder="Deskripsi singkat program..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Jenjang</label>
                <select v-model="form.level" class="form-input">
                  <option value="">Pilih Jenjang</option>
                  <option v-for="opt in levelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-group category-group">
                <label class="form-label">Kategori</label>
                <div class="category-input-wrapper">
                  <input 
                    v-model="categorySearch" 
                    type="text" 
                    class="form-input" 
                    placeholder="Ketik atau pilih kategori..."
                    @focus="showCategoryDropdown = true"
                    @input="showCategoryDropdown = true"
                  >
                  <div v-if="form.category_name" class="selected-category">
                    {{ form.category_name }}
                    <button type="button" @click="form.category_name = ''; categorySearch = ''" class="clear-btn">&times;</button>
                  </div>
                </div>
                
                <!-- Dropdown suggestions -->
                <div v-if="showCategoryDropdown && categorySearch" class="category-dropdown">
                  <div 
                    v-for="cat in filteredCategories" 
                    :key="cat" 
                    class="category-option"
                    @click="selectCategory(cat)"
                  >
                    {{ cat }}
                  </div>
                  <div v-if="filteredCategories.length === 0 && categorySearch" class="category-option custom-option" @click="useCustomCategory()">
                    <span class="custom-icon">+</span> Gunakan "{{ categorySearch }}"
                  </div>
                  <div v-else-if="categorySearch && !filteredCategories.includes(categorySearch)" class="category-option custom-option" @click="useCustomCategory()">
                    <span class="custom-icon">+</span> Gunakan "{{ categorySearch }}"
                  </div>
                </div>
              </div>
            </div>

            <!-- Class Type for Hybrid Les Places -->
            <div v-if="isHybridLesPlace" class="form-group">
              <label class="form-label">Tipe Kelas <span class="required">*</span></label>
              <select v-model="form.class_type" class="form-input" required>
                <option value="">Pilih Tipe Kelas</option>
                <option value="online">Online (Materi, Video, Quiz, Latihan)</option>
                <option value="offline">Offline (Hanya Jadwal & Nilai)</option>
              </select>
              <small class="form-hint">Pilih tipe kelas karena tempat les Anda berjenis Hybrid</small>
            </div>
            
            <!-- Info for non-Hybrid -->
            <div v-else class="class-type-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>Tipe kelas: <strong>{{ autoClassType === 'online' ? 'Online' : 'Offline' }}</strong> (sesuai tipe tempat les)</span>
            </div>
          </div>

          <!-- Program Details -->
          <div class="form-section">
            <h3 class="section-title">Detail Program</h3>
            
            <div class="form-row form-row-4">
              <div class="form-group">
                <label class="form-label">Durasi (bulan)</label>
                <input v-model.number="form.duration_months" type="number" min="1" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Pertemuan/Minggu</label>
                <input v-model.number="form.sessions_per_week" type="number" min="1" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Durasi Sesi (menit)</label>
                <input v-model.number="form.session_duration_minutes" type="number" min="30" step="30" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Total Sesi</label>
                <input :value="totalSessions" type="number" class="form-input" disabled>
              </div>
            </div>

            <div class="form-row form-row-3" v-if="lesPlace?.type !== 'offline'">
              <div class="form-group">
                <label class="form-label">Jumlah Modul</label>
                <input v-model.number="form.total_modules" type="number" min="0" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Jumlah Video</label>
                <input v-model.number="form.total_videos" type="number" min="0" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Jumlah Latihan</label>
                <input v-model.number="form.total_exercises" type="number" min="0" class="form-input">
              </div>
            </div>
          </div>

          <!-- Capacity & Pricing -->
          <div class="form-section">
            <h3 class="section-title">Kapasitas & Harga</h3>
            
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">Kapasitas Siswa</label>
                <input v-model.number="form.capacity" type="number" min="1" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Harga (Rp)</label>
                <input v-model.number="form.price" type="number" min="0" step="50000" class="form-input">
                <small class="form-hint">Biaya platform 10% akan dipotong dari setiap pembayaran siswa</small>
              </div>
              <div class="form-group">
                <label class="form-label">Tipe Harga</label>
                <select v-model="form.price_type" class="form-input">
                  <option v-for="opt in priceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Schedule -->
          <div class="form-section">
            <h3 class="section-title">Jadwal Kelas</h3>
            <p class="section-desc">Pilih hari dan atur jam kelas</p>
            
            <div class="schedule-grid">
              <div v-for="(data, day) in scheduleForm" :key="day" class="schedule-row">
                <label class="schedule-checkbox">
                  <input type="checkbox" v-model="data.enabled">
                  <span class="day-label">{{ dayLabels[day] }}</span>
                </label>
                <div class="schedule-times" v-if="data.enabled">
                  <input v-model="data.start" type="time" class="time-input">
                  <span>-</span>
                  <input v-model="data.end" type="time" class="time-input">
                </div>
                <div v-else class="schedule-disabled">-</div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="form-section">
            <div class="toggle-setting">
              <div class="toggle-info">
                <strong>Program Aktif</strong>
                <p>Program aktif akan muncul di halaman publik</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="form.is_active">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">Batal</button>
          <button class="btn btn-primary" @click="saveProgram" :disabled="saving || !form.name">
            {{ saving ? 'Menyimpan...' : (editingProgram ? 'Simpan Perubahan' : 'Tambah Program') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:var(--spacing-xl);overflow-y:auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--spacing-lg);flex-wrap:wrap;gap:var(--spacing-md)}
.header-left h1{font-size:var(--font-size-2xl);margin-bottom:var(--spacing-xs)}
.header-desc{color:var(--text-muted);font-size:var(--font-size-sm)}
.btn-icon{width:18px;height:18px;margin-right:var(--spacing-xs)}

.alert{display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-md);border-radius:var(--radius-lg);margin-bottom:var(--spacing-lg);font-size:var(--font-size-sm)}
.alert-success{background:#dcfce7;color:#16a34a}
.alert-error{background:#fef2f2;color:#dc2626}
.alert-close{background:none;border:none;font-size:20px;cursor:pointer}

.loading-state{display:flex;justify-content:center;padding:var(--spacing-3xl)}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.empty-state{background:white;border-radius:var(--radius-xl);padding:var(--spacing-3xl);text-align:center}
.empty-icon{margin-bottom:var(--spacing-md);display:flex;justify-content:center}
.empty-icon svg{width:64px;height:64px;color:var(--text-muted)}
.empty-state h3{margin-bottom:var(--spacing-sm)}
.empty-state p{color:var(--text-muted);margin-bottom:var(--spacing-lg)}

/* Programs Grid */
.programs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:var(--spacing-lg)}
.program-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);box-shadow:var(--shadow-sm);transition:all var(--transition-fast)}
.program-card:hover{box-shadow:var(--shadow-md)}
.program-card.inactive{opacity:0.6}

.program-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--spacing-sm)}
.program-title{display:flex;align-items:center;gap:var(--spacing-sm);flex-wrap:wrap}
.program-title h3{font-size:var(--font-size-lg);margin:0}
.level-badge{padding:4px 12px;border-radius:var(--radius-full);color:white;font-size:var(--font-size-xs);font-weight:600}

.program-actions{display:flex;gap:var(--spacing-xs)}
.action-btn{width:32px;height:32px;border:none;background:var(--background);border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--transition-fast)}
.action-btn svg{width:16px;height:16px;color:var(--text-muted)}
.action-btn:hover{background:var(--border)}
.action-btn:hover svg{color:var(--text)}
.action-btn.danger:hover{background:#fef2f2}
.action-btn.danger:hover svg{color:#dc2626}

.program-desc{color:var(--text-secondary);font-size:var(--font-size-sm);margin-bottom:var(--spacing-md);line-height:1.5}

.program-stats{display:flex;flex-wrap:wrap;gap:var(--spacing-md);margin-bottom:var(--spacing-md)}
.stat{display:flex;align-items:center;gap:var(--spacing-xs);font-size:var(--font-size-sm);color:var(--text-secondary)}
.stat svg{width:16px;height:16px;color:var(--primary)}

.program-schedule{background:var(--background);border-radius:var(--radius-lg);padding:var(--spacing-md);margin-bottom:var(--spacing-md)}
.schedule-title{font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--spacing-sm)}
.schedule-list{display:flex;flex-direction:column;gap:var(--spacing-xs)}
.schedule-item{display:flex;justify-content:space-between;font-size:var(--font-size-sm)}
.schedule-day{color:var(--text)}
.schedule-time{color:var(--text-muted)}

.program-footer{border-top:1px solid var(--border);padding-top:var(--spacing-md)}
.price-tag{background:linear-gradient(135deg,var(--secondary) 0%,var(--primary) 100%);color:white;padding:var(--spacing-md);border-radius:var(--radius-lg);display:flex;justify-content:space-between;align-items:center}
.price-label{font-size:var(--font-size-sm);opacity:0.9}
.price-value{font-size:var(--font-size-lg);font-weight:700}
.price-value small{font-size:var(--font-size-xs);font-weight:400;opacity:0.8}

/* Modal */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:var(--spacing-lg)}
.modal{background:white;border-radius:var(--radius-xl);width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-lg);border-bottom:1px solid var(--border)}
.modal-header h2{font-size:var(--font-size-xl);margin:0}
.modal-close{width:36px;height:36px;border:none;background:var(--background);border-radius:var(--radius-md);font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.modal-body{flex:1;overflow-y:auto;padding:var(--spacing-lg)}
.modal-footer{display:flex;justify-content:flex-end;gap:var(--spacing-sm);padding:var(--spacing-lg);border-top:1px solid var(--border)}

/* Form Sections */
.form-section{margin-bottom:var(--spacing-xl)}
.section-title{font-size:var(--font-size-md);font-weight:600;margin-bottom:var(--spacing-md);color:var(--text)}
.section-desc{font-size:var(--font-size-sm);color:var(--text-muted);margin-bottom:var(--spacing-md)}

.form-group{margin-bottom:var(--spacing-md)}
.form-label{display:block;font-weight:500;margin-bottom:var(--spacing-xs);font-size:var(--font-size-sm)}
.required{color:var(--error)}
.form-input{width:100%;padding:var(--spacing-sm) var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-sm)}
.form-input:focus{border-color:var(--primary);outline:none}
.form-input:disabled{background:var(--background);color:var(--text-muted)}

.form-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-md)}
.form-row-3{grid-template-columns:repeat(3,1fr)}
.form-row-4{grid-template-columns:repeat(4,1fr)}

/* Schedule Grid */
.schedule-grid{display:flex;flex-direction:column;gap:var(--spacing-sm)}
.schedule-row{display:flex;align-items:center;gap:var(--spacing-md);padding:var(--spacing-sm);background:var(--background);border-radius:var(--radius-md)}
.schedule-checkbox{display:flex;align-items:center;gap:var(--spacing-sm);min-width:120px}
.schedule-checkbox input{width:18px;height:18px}
.day-label{font-size:var(--font-size-sm);font-weight:500}
.schedule-times{display:flex;align-items:center;gap:var(--spacing-sm)}
.time-input{padding:var(--spacing-xs) var(--spacing-sm);border:1px solid var(--border);border-radius:var(--radius-md);font-size:var(--font-size-sm)}
.schedule-disabled{color:var(--text-muted);font-size:var(--font-size-sm)}

/* Toggle */
.toggle-setting{display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-md);background:var(--background);border-radius:var(--radius-lg)}
.toggle-info strong{display:block;font-size:var(--font-size-sm)}
.toggle-info p{margin:0;font-size:var(--font-size-xs);color:var(--text-muted)}
.toggle-switch{position:relative;width:48px;height:26px}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;transition:.3s;border-radius:26px}
.toggle-slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:white;transition:.3s;border-radius:50%}
.toggle-switch input:checked+.toggle-slider{background:var(--primary)}
.toggle-switch input:checked+.toggle-slider:before{transform:translateX(22px)}

/* Category Searchable Dropdown */
.category-group{position:relative}
.category-input-wrapper{position:relative}
.selected-category{display:flex;align-items:center;gap:var(--spacing-xs);margin-top:var(--spacing-xs);padding:var(--spacing-xs) var(--spacing-sm);background:var(--primary);color:white;border-radius:var(--radius-md);font-size:var(--font-size-sm);width:fit-content}
.clear-btn{background:none;border:none;color:white;font-size:16px;cursor:pointer;padding:0 4px;opacity:0.8}
.clear-btn:hover{opacity:1}
.category-dropdown{position:absolute;top:100%;left:0;right:0;max-height:200px;overflow-y:auto;background:white;border:2px solid var(--primary);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);z-index:100;margin-top:4px}
.category-option{padding:var(--spacing-sm) var(--spacing-md);cursor:pointer;font-size:var(--font-size-sm);transition:background var(--transition-fast)}
.category-option:hover{background:var(--background)}
.category-option.custom-option{background:#f0fdf4;color:var(--secondary);font-weight:500;border-top:1px solid var(--border)}
.category-option.custom-option:hover{background:#dcfce7}
.custom-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:var(--secondary);color:white;border-radius:50%;font-size:12px;margin-right:var(--spacing-xs)}

/* Class Type Info */
.class-type-info{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);background:#e0f2fe;border-radius:var(--radius-md);color:#0369a1;font-size:var(--font-size-sm);margin-bottom:var(--spacing-md)}
.class-type-info svg{width:18px;height:18px;flex-shrink:0}
.class-type-info strong{color:#0c4a6e}
.form-hint{display:block;margin-top:4px;font-size:var(--font-size-xs);color:var(--text-muted)}

/* Responsive */
@media(max-width:768px){
  .dashboard{flex-direction:column}
  .main{padding:var(--spacing-md)}
  .programs-grid{grid-template-columns:1fr}
  .form-row,.form-row-3,.form-row-4{grid-template-columns:1fr}
  .modal{max-height:100vh;border-radius:0}
}
</style>
