<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()

const lesPlace = ref(null)
const owner = ref(null)
const loading = ref(true)
const saving = ref(false)
const activeTab = ref('info')
const message = ref({ type: '', text: '' })

// Form data for editing
const form = ref({
  name: '',
  description: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  type: 'offline',
  photos: [],
  facilities: [],
  highlights: [],
  highlights: [],
  is_active: true
})

// Photo upload
const photoInput = ref(null)
const uploadingPhoto = ref(false)
const uploadError = ref('')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Facility and Highlight inputs
const newFacility = ref('')
const newHighlight = ref('')

// Location API
const provinces = ref([])
const cities = ref([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)

// Les Type Options
const lesTypeOptions = [
  { value: 'offline', label: 'Offline (Tatap Muka)', description: 'Les dilakukan secara langsung di tempat' },
  { value: 'online', label: 'Online', description: 'Les dilakukan secara daring/virtual' },
  { value: 'hybrid', label: 'Hybrid (Offline & Online)', description: 'Kombinasi les tatap muka dan daring' }
]

// Facility suggestions based on les type
const facilitySuggestions = computed(() => {
  const base = ['WiFi Gratis', 'AC', 'Toilet', 'Musholla', 'Kantin', 'Parkir']
  if (form.value.type === 'offline' || form.value.type === 'hybrid') {
    return [...base, 'Ruang Kelas', 'Ruang Tunggu', 'Perpustakaan', 'Lab Komputer', 'Papan Tulis Digital']
  }
  if (form.value.type === 'online') {
    return ['Video Conference', 'Materi Digital', 'Rekaman Kelas', 'Quiz Online', 'Forum Diskusi', 'Support 24/7']
  }
  return base
})

// Highlight suggestions
const highlightSuggestions = [
  'Guru Berpengalaman',
  'Kurikulum Terbaru',
  'Kelas Kecil (Max 10 Siswa)',
  'Garansi Nilai Naik',
  'Try Out Gratis',
  'Konsultasi Gratis',
  'Jadwal Fleksibel',
  'Bimbingan Intensif',
  'Materi Lengkap',
  'Laporan Progress Mingguan'
]

onMounted(async () => {
  await fetchProvinces()
  await fetchOwnerAndLesPlace()
})

async function fetchProvinces() {
  loadingProvinces.value = true
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    provinces.value = await res.json()
  } catch (err) {
    console.error('Error fetching provinces:', err)
    provinces.value = [
      { id: '31', name: 'DKI JAKARTA' },
      { id: '32', name: 'JAWA BARAT' },
      { id: '33', name: 'JAWA TENGAH' },
      { id: '34', name: 'DI YOGYAKARTA' },
      { id: '35', name: 'JAWA TIMUR' },
      { id: '36', name: 'BANTEN' }
    ]
  } finally {
    loadingProvinces.value = false
  }
}

async function fetchCities(provinceName) {
  if (!provinceName) return
  loadingCities.value = true
  try {
    const province = provinces.value.find(p => p.name === provinceName)
    if (province) {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${province.id}.json`)
      cities.value = await res.json()
    }
  } catch (err) {
    console.error('Error fetching cities:', err)
  } finally {
    loadingCities.value = false
  }
}

watch(() => form.value.province, async (newVal) => {
  if (newVal) {
    await fetchCities(newVal)
  }
})

async function fetchOwnerAndLesPlace() {
  loading.value = true
  try {
    // Get owner data
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id, owner_type, business_name')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!ownerData) {
      loading.value = false
      return
    }
    
    owner.value = ownerData

    // Get les place for this owner
    let { data: lesData } = await supabase
      .from('les_places')
      .select(`
        *,
        programs(id, name, price, is_active)
      `)
      .eq('owner_id', ownerData.id)
      .single()

    // AUTO CREATE les_place jika belum ada
    if (!lesData) {
      const userName = authStore.userProfile?.name || authStore.user?.email?.split('@')[0] || 'Tempat Les'
      
      const { data: newLesPlace, error: createError } = await supabase
        .from('les_places')
        .insert({
          owner_id: ownerData.id,
          name: userName + "'s Les",
          description: 'Selamat datang di tempat les kami! Silakan edit informasi ini.',
          address: 'Alamat belum diisi',
          type: 'offline',
          is_verified: false,
          is_active: true,
          photos: [],
          facilities: [],
          total_students: 0,
          rating: 0,
          total_reviews: 0
        })
        .select(`*, programs(id, name, price, is_active)`)
        .single()
      
      if (!createError && newLesPlace) {
        lesData = newLesPlace
      }
    }

    if (lesData) {
      lesPlace.value = lesData
      
      // If total_students is 0, calculate from paid bookings
      if (!lesData.total_students || lesData.total_students === 0) {
        const { count: paidStudentCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('program_id', (lesData.programs || []).map(p => p.id))
          .in('payment_status', ['paid', 'settlement', 'capture'])
        
        lesPlace.value.total_students = paidStudentCount || 0
      }

      // Populate form with existing data
      form.value = {
        name: lesData.name || '',
        description: lesData.description || '',
        address: lesData.address || '',
        city: lesData.city || '',
        province: lesData.province || '',
        postal_code: lesData.postal_code || '',
        type: lesData.type || 'offline',
        photos: lesData.photos || [],
        facilities: lesData.facilities || [],
        highlights: lesData.highlights || [],
        is_active: lesData.is_active !== false
      }
      
      // Fetch cities for the province
      if (lesData.province) {
        await fetchCities(lesData.province)
      }
    }
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  if (!lesPlace.value?.id) return
  
  saving.value = true
  message.value = { type: '', text: '' }
  
  try {
    const { error } = await supabase
      .from('les_places')
      .update({
        name: form.value.name,
        description: form.value.description,
        address: form.value.address,
        city: form.value.city,
        province: form.value.province,
        postal_code: form.value.postal_code,
        type: form.value.type,
        photos: form.value.photos,
        facilities: form.value.facilities,
        highlights: form.value.highlights,
        is_active: form.value.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', lesPlace.value.id)
    
    if (error) throw error
    
    message.value = { type: 'success', text: 'Perubahan berhasil disimpan!' }
    
    // Refresh data
    await fetchOwnerAndLesPlace()
  } catch (err) {
    console.error('Error saving:', err)
    message.value = { type: 'error', text: 'Gagal menyimpan perubahan: ' + err.message }
  } finally {
    saving.value = false
  }
}

// Photo management
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  uploadError.value = ''
  
  // Validate max photos (5)
  const MAX_PHOTOS = 5
  if (form.value.photos.length >= MAX_PHOTOS) {
    uploadError.value = `Maksimal ${MAX_PHOTOS} foto. Hapus foto yang ada untuk menambahkan yang baru.`
    if (photoInput.value) photoInput.value.value = ''
    return
  }
  
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError.value = 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.'
    return
  }
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    uploadError.value = `Ukuran file terlalu besar (${formatFileSize(file.size)}). Maksimal 5MB.`
    return
  }
  
  uploadingPhoto.value = true
  
  try {
    // Check if lesPlace exists
    if (!lesPlace.value?.id) {
      uploadError.value = 'Tempat les belum terbuat. Silakan refresh halaman atau hubungi admin.'
      uploadingPhoto.value = false
      return
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${lesPlace.value.id}/${Date.now()}.${fileExt}`
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('les-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('les-photos')
      .getPublicUrl(fileName)
    
    // Add to photos array
    form.value.photos.push(publicUrl)
    
    // Reset input
    if (photoInput.value) photoInput.value.value = ''
    
  } catch (err) {
    console.error('Upload error:', err)
    uploadError.value = 'Gagal mengupload foto: ' + err.message
  } finally {
    uploadingPhoto.value = false
  }
}

async function removePhoto(index) {
  const photoUrl = form.value.photos[index]
  
  // Try to delete from storage if it's a Supabase URL
  if (photoUrl.includes('supabase')) {
    try {
      const path = photoUrl.split('/les-photos/')[1]
      if (path) {
        await supabase.storage.from('les-photos').remove([path])
      }
    } catch (err) {
      console.error('Error deleting from storage:', err)
    }
  }
  
  form.value.photos.splice(index, 1)
}

// Facility management
function addFacility(facility = null) {
  const f = facility || newFacility.value.trim()
  if (f && !form.value.facilities.includes(f)) {
    form.value.facilities.push(f)
    newFacility.value = ''
  }
}

function removeFacility(index) {
  form.value.facilities.splice(index, 1)
}

// Highlight management
function addHighlight(highlight = null) {
  const h = highlight || newHighlight.value.trim()
  if (h && !form.value.highlights.includes(h)) {
    form.value.highlights.push(h)
    newHighlight.value = ''
  }
}

function removeHighlight(index) {
  form.value.highlights.splice(index, 1)
}

function getLesTypeLabel(type) {
  const labels = {
    'offline': 'Offline',
    'online': 'Online',
    'hybrid': 'Hybrid'
  }
  return labels[type] || type
}

const totalPrograms = computed(() => lesPlace.value?.programs?.length || 0)
const activePrograms = computed(() => lesPlace.value?.programs?.filter(p => p.is_active)?.length || 0)
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <div class="header-left">
          <h1>Kelola Tempat Les</h1>
          <p class="header-desc">Kelola informasi lengkap tempat les Anda</p>
        </div>
        <div class="header-actions">
          <span :class="['status-badge', form.is_active ? 'active' : 'inactive']">
            {{ form.is_active ? 'Aktif' : 'Nonaktif' }}
          </span>
          <button class="btn btn-primary" @click="saveChanges" :disabled="saving">
            <svg v-if="!saving" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            <span v-if="saving">Menyimpan...</span>
            <span v-else>Simpan Perubahan</span>
          </button>
        </div>
      </header>

      <!-- Message Alert -->
      <div v-if="message.text" :class="['alert', `alert-${message.type}`]">
        {{ message.text }}
        <button class="alert-close" @click="message.text = ''">&times;</button>
      </div>

      <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

      <div v-if="!loading" class="content-wrapper">
        <!-- Quick Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="2"></line><line x1="14" y1="2" x2="14" y2="22"></line></svg>
            </span>
            <div class="stat-info">
              <span class="stat-value">{{ getLesTypeLabel(form.type) }}</span>
              <span class="stat-label">Jenis Les</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </span>
            <div class="stat-info">
              <span class="stat-value">{{ activePrograms }}/{{ totalPrograms }}</span>
              <span class="stat-label">Program Aktif</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </span>
            <div class="stat-info">
              <span class="stat-value">{{ lesPlace?.total_students || 0 }}</span>
              <span class="stat-label">Total Siswa</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </span>
            <div class="stat-info">
              <span class="stat-value">{{ lesPlace?.rating || 0 }}</span>
              <span class="stat-label">Rating</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Informasi Dasar
          </button>
          <button :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Foto
          </button>
          <button :class="{ active: activeTab === 'facilities' }" @click="activeTab = 'facilities'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Fasilitas
          </button>
          <button :class="{ active: activeTab === 'highlights' }" @click="activeTab = 'highlights'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Keunggulan
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Info Tab -->
          <div v-if="activeTab === 'info'" class="tab-pane">
            <div class="section-card">
              <h3 class="section-title">Informasi Tempat Les</h3>
              
              <div class="form-group">
                <label class="form-label">Nama Tempat Les <span class="required">*</span></label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Contoh: Bimbel Cerdas Cemerlang">
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi</label>
                <textarea v-model="form.description" class="form-input" rows="4" placeholder="Jelaskan tentang tempat les Anda, visi misi, pengalaman, dll..."></textarea>
                <span class="form-hint">Deskripsi yang baik akan membantu calon siswa memahami tempat les Anda</span>
              </div>

              <div class="form-group">
                <label class="form-label">Jenis Les <span class="required">*</span></label>
                <div class="type-cards">
                  <div 
                    v-for="opt in lesTypeOptions" 
                    :key="opt.value" 
                    class="type-card" 
                    :class="{ selected: form.type === opt.value }"
                    @click="form.type = opt.value"
                  >
                    <div class="type-radio">
                      <span class="radio-dot" :class="{ active: form.type === opt.value }"></span>
                    </div>
                    <div class="type-info">
                      <strong>{{ opt.label }}</strong>
                      <p>{{ opt.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-card">
              <h3 class="section-title">Lokasi</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Provinsi</label>
                  <select v-model="form.province" class="form-input" :disabled="loadingProvinces">
                    <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih Provinsi' }}</option>
                    <option v-for="prov in provinces" :key="prov.id" :value="prov.name">{{ prov.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Kota/Kabupaten</label>
                  <select v-model="form.city" class="form-input" :disabled="!form.province || loadingCities">
                    <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih Kota' }}</option>
                    <option v-for="city in cities" :key="city.id" :value="city.name">{{ city.name }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Alamat Lengkap</label>
                <textarea v-model="form.address" class="form-input" rows="2" placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"></textarea>
                <span class="form-hint">Alamat ini akan ditampilkan di kartu tempat les Anda</span>
              </div>

              <div class="form-group" v-if="form.type !== 'online'">
                <label class="form-label">Kode Pos</label>
                <input v-model="form.postal_code" type="text" class="form-input" placeholder="12345" maxlength="5" style="max-width: 150px;">
              </div>

        
            </div>
          </div>

          <!-- Photos Tab -->
          <div v-if="activeTab === 'photos'" class="tab-pane">
            <div class="section-card">
              <h3 class="section-title">Foto Tempat Les</h3>
              <p class="section-desc">Tambahkan foto-foto tempat les Anda untuk menarik calon siswa.</p>
              
              <div class="info-box" style="margin-bottom: 24px;">
                <p><strong>Note:</strong> Foto pertama yang Anda upload akan menjadi <strong>Thumbnail</strong> tempat les Anda.</p>
              </div>

              <!-- Photo Upload Info -->
              <div class="upload-info">
                <div class="info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>Format: JPG, PNG, WebP</span>
                </div>
                <div class="info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Ukuran maksimal: 5MB per foto</span>
                </div>
                <div class="info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  <span>Resolusi optimal: 800 x 600 pixels</span>
                </div>
              </div>

              <!-- Upload Error -->
              <div v-if="uploadError" class="upload-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                {{ uploadError }}
              </div>

              <!-- Photos Grid -->
              <div class="photos-grid" v-if="form.photos.length">
                <div v-for="(photo, index) in form.photos" :key="index" class="photo-item" :class="{ primary: index === 0 }">
                  <img :src="photo" :alt="`Foto ${index + 1}`">
                  <span v-if="index === 0" class="primary-badge">Foto Utama</span>
                  <span class="photo-number">{{ index + 1 }}</span>
                  <button class="photo-remove" @click="removePhoto(index)">&times;</button>
                </div>
              </div>

              <!-- Upload Section -->
              <div class="upload-section" :class="{ disabled: form.photos.length >= 5 }">
                <div class="photo-counter">
                  <span :class="{ 'max-reached': form.photos.length >= 5 }">{{ form.photos.length }}/5 foto</span>
                </div>
                <input 
                  ref="photoInput"
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  class="file-input-hidden"
                  @change="handlePhotoUpload"
                  :disabled="form.photos.length >= 5"
                >
                <div 
                  class="upload-box" 
                  @click="form.photos.length < 5 && triggerPhotoUpload()" 
                  :class="{ uploading: uploadingPhoto, disabled: form.photos.length >= 5 }"
                >
                  <div v-if="uploadingPhoto" class="upload-progress">
                    <div class="loading-spinner"></div>
                    <span>Mengupload foto...</span>
                  </div>
                  <div v-else-if="form.photos.length >= 5" class="upload-placeholder max-reached">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span class="upload-text">Maksimal 5 foto tercapai</span>
                    <span class="upload-hint">Hapus foto yang ada untuk menambahkan yang baru</span>
                  </div>
                  <div v-else class="upload-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span class="upload-text">Klik untuk memilih foto</span>
                    <span class="upload-hint">atau drag & drop file di sini</span>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="!form.photos.length && !uploadingPhoto" class="empty-photos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <p>Belum ada foto. Tambahkan foto untuk menarik lebih banyak siswa!</p>
              </div>
            </div>
          </div>

          <!-- Facilities Tab -->
          <div v-if="activeTab === 'facilities'" class="tab-pane">
            <div class="section-card">
              <h3 class="section-title">Fasilitas</h3>
              <p class="section-desc" v-if="form.type === 'offline'">Fasilitas fisik yang tersedia di tempat les Anda.</p>
              <p class="section-desc" v-else-if="form.type === 'online'">Fasilitas digital dan layanan yang Anda sediakan.</p>
              <p class="section-desc" v-else>Fasilitas untuk pembelajaran tatap muka dan online.</p>

              <div class="tags-container" v-if="form.facilities.length">
                <span v-for="(facility, index) in form.facilities" :key="facility" class="tag">
                  {{ facility }}
                  <button class="tag-remove" @click="removeFacility(index)">&times;</button>
                </span>
              </div>

              <div class="add-tag-section">
                <div class="input-with-button">
                  <input v-model="newFacility" type="text" class="form-input" placeholder="Tambah fasilitas baru..." @keyup.enter="addFacility()">
                  <button class="btn btn-outline" @click="addFacility()" :disabled="!newFacility">+ Tambah</button>
                </div>
              </div>

              <div class="suggestions-section">
                <p class="suggestions-label">Saran fasilitas:</p>
                <div class="suggestions-grid">
                  <button 
                    v-for="suggestion in facilitySuggestions" 
                    :key="suggestion" 
                    class="suggestion-btn"
                    :class="{ added: form.facilities.includes(suggestion) }"
                    @click="addFacility(suggestion)"
                    :disabled="form.facilities.includes(suggestion)"
                  >
                    {{ suggestion }}
                    <span v-if="form.facilities.includes(suggestion)">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Highlights Tab -->
          <div v-if="activeTab === 'highlights'" class="tab-pane">
            <div class="section-card">
              <h3 class="section-title">Keunggulan</h3>
              <p class="section-desc">Keunggulan atau nilai plus dari tempat les Anda yang membedakan dari kompetitor.</p>

              <div class="tags-container" v-if="form.highlights.length">
                <span v-for="(highlight, index) in form.highlights" :key="highlight" class="tag tag-highlight">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tag-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  {{ highlight }}
                  <button class="tag-remove" @click="removeHighlight(index)">&times;</button>
                </span>
              </div>

              <div class="add-tag-section">
                <div class="input-with-button">
                  <input v-model="newHighlight" type="text" class="form-input" placeholder="Tambah keunggulan baru..." @keyup.enter="addHighlight()">
                  <button class="btn btn-outline" @click="addHighlight()" :disabled="!newHighlight">+ Tambah</button>
                </div>
              </div>

              <div class="suggestions-section">
                <p class="suggestions-label">Saran keunggulan:</p>
                <div class="suggestions-grid">
                  <button 
                    v-for="suggestion in highlightSuggestions" 
                    :key="suggestion" 
                    class="suggestion-btn"
                    :class="{ added: form.highlights.includes(suggestion) }"
                    @click="addHighlight(suggestion)"
                    :disabled="form.highlights.includes(suggestion)"
                  >
                    {{ suggestion }}
                    <span v-if="form.highlights.includes(suggestion)">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:var(--spacing-xl);overflow-y:auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--spacing-lg);flex-wrap:wrap;gap:var(--spacing-md)}
.header-left h1{font-size:var(--font-size-2xl);margin-bottom:var(--spacing-xs)}
.header-desc{color:var(--text-muted);font-size:var(--font-size-sm)}
.header-actions{display:flex;align-items:center;gap:var(--spacing-md)}
.status-badge{padding:6px 16px;border-radius:var(--radius-full);font-size:var(--font-size-xs);font-weight:600}
.status-badge.active{background:#dcfce7;color:#16a34a}
.status-badge.inactive{background:#fef2f2;color:#dc2626}

.loading-state{display:flex;justify-content:center;padding:var(--spacing-3xl)}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.empty-state{background:white;border-radius:var(--radius-xl);padding:var(--spacing-3xl);text-align:center}
.empty-icon{margin-bottom:var(--spacing-md);display:flex;justify-content:center}
.empty-icon svg{width:64px;height:64px;color:var(--text-muted)}
.empty-state h3{margin-bottom:var(--spacing-sm)}
.empty-state p{color:var(--text-muted);margin-bottom:var(--spacing-lg)}

.alert{display:flex;align-items:center;justify-content:space-between;padding:var(--spacing-md);border-radius:var(--radius-lg);margin-bottom:var(--spacing-lg);font-size:var(--font-size-sm)}
.alert-success{background:#dcfce7;color:#16a34a}
.alert-error{background:#fef2f2;color:#dc2626}
.alert-close{background:none;border:none;font-size:20px;cursor:pointer;opacity:0.7}

/* Stats Row */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--spacing-md);margin-bottom:var(--spacing-lg)}
.stat-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);display:flex;align-items:center;gap:var(--spacing-md);box-shadow:var(--shadow-sm)}
.stat-icon{width:48px;height:48px;background:#F1F5F9;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center}
.stat-icon svg{width:26px;height:26px;color:#0D5782}
.stat-info{display:flex;flex-direction:column}
.stat-value{font-size:var(--font-size-xl);font-weight:700;color:var(--text)}
.stat-label{font-size:var(--font-size-xs);color:var(--text-muted)}

/* Tabs */
.tabs{display:flex;gap:var(--spacing-xs);background:white;padding:var(--spacing-sm);border-radius:var(--radius-xl);margin-bottom:var(--spacing-lg);flex-wrap:wrap}
.tabs button{display:flex;align-items:center;gap:var(--spacing-xs);padding:var(--spacing-sm) var(--spacing-lg);background:transparent;border:none;border-radius:var(--radius-lg);font-weight:500;font-size:var(--font-size-sm);color:var(--text-muted);cursor:pointer;transition:all var(--transition-fast)}
.tabs button svg{width:18px;height:18px}
.tabs button:hover{background:var(--background)}
.tabs button.active{background:var(--primary);color:white}
.tabs button.active svg{color:white}

/* Button Icon */
.btn-icon{width:18px;height:18px;margin-right:var(--spacing-xs)}
.btn{display:inline-flex;align-items:center}

/* Tab Content */
.tab-content{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.section-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-xl);box-shadow:var(--shadow-sm)}
.section-title{font-size:var(--font-size-lg);font-weight:600;margin-bottom:var(--spacing-sm);color:var(--text)}
.section-desc{color:var(--text-muted);font-size:var(--font-size-sm);margin-bottom:var(--spacing-lg)}

/* Form Styles */
.form-group{margin-bottom:var(--spacing-lg)}
.form-label{display:block;font-weight:500;margin-bottom:var(--spacing-xs);font-size:var(--font-size-sm);color:var(--text)}
.required{color:var(--error)}
.form-input{width:100%;padding:var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-sm);transition:border-color var(--transition-fast)}
.form-input:focus{border-color:var(--primary);outline:none}
.form-hint{display:block;margin-top:var(--spacing-xs);font-size:var(--font-size-xs);color:var(--text-muted)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-lg)}

/* Type Cards */
.type-cards{display:flex;flex-direction:column;gap:var(--spacing-sm)}
.type-card{display:flex;align-items:flex-start;gap:var(--spacing-md);padding:var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);cursor:pointer;transition:all var(--transition-fast)}
.type-card:hover{border-color:var(--primary)}
.type-card.selected{border-color:var(--secondary);background:#e6f7fb}
.type-radio{padding-top:2px}
.radio-dot{display:block;width:18px;height:18px;border-radius:50%;border:2px solid #9ca3af;position:relative}
.radio-dot.active{border-color:var(--secondary)}
.radio-dot.active::after{content:'';position:absolute;top:3px;left:3px;width:8px;height:8px;border-radius:50%;background:var(--secondary)}
.type-info strong{display:block;font-size:var(--font-size-sm);color:var(--text);margin-bottom:2px}
.type-info p{font-size:var(--font-size-xs);color:var(--text-secondary);margin:0}

/* Info Box */
.info-box{display:flex;align-items:flex-start;gap:var(--spacing-sm);padding:var(--spacing-md);background:#e6f7fb;border-radius:var(--radius-lg);margin-top:var(--spacing-md)}
.info-icon{font-size:20px}
.info-box p{margin:0;font-size:var(--font-size-sm);color:#0a4568}

/* Photos Grid */
.photos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--spacing-md);margin-bottom:var(--spacing-lg)}
.photo-item{position:relative;aspect-ratio:4/3;border-radius:var(--radius-lg);overflow:hidden;border:2px solid var(--border)}
.photo-item.primary{border-color:var(--primary);border-width:3px}
.photo-item img{width:100%;height:100%;object-fit:cover}
.primary-badge{position:absolute;top:var(--spacing-sm);left:var(--spacing-sm);background:var(--primary);color:white;padding:4px 10px;border-radius:var(--radius-full);font-size:10px;font-weight:600}
.photo-number{position:absolute;bottom:var(--spacing-sm);left:var(--spacing-sm);background:rgba(0,0,0,0.7);color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}
.photo-remove{position:absolute;top:var(--spacing-sm);right:var(--spacing-sm);width:24px;height:24px;background:rgba(0,0,0,0.7);color:white;border:none;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
.photo-remove:hover{background:var(--error)}

/* Upload Info */
.upload-info{display:flex;flex-wrap:wrap;gap:var(--spacing-md);padding:var(--spacing-md);background:var(--background);border-radius:var(--radius-lg);margin-bottom:var(--spacing-lg)}
.upload-info .info-item{display:flex;align-items:center;gap:var(--spacing-xs);font-size:var(--font-size-xs);color:var(--text-secondary)}
.upload-info .info-item svg{width:16px;height:16px;color:var(--primary)}

/* Upload Error */
.upload-error{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-md);background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-lg);color:#dc2626;font-size:var(--font-size-sm);margin-bottom:var(--spacing-lg)}
.upload-error svg{width:20px;height:20px;flex-shrink:0}

/* Upload Section */
.upload-section{margin-bottom:var(--spacing-lg)}
.file-input-hidden{display:none}
.upload-box{border:2px dashed var(--border);border-radius:var(--radius-xl);padding:var(--spacing-xl);text-align:center;cursor:pointer;transition:all var(--transition-fast);background:var(--background)}
.upload-box:hover{border-color:var(--primary);background:rgba(136,208,228,0.05)}
.upload-box.uploading{pointer-events:none;opacity:0.7}
.upload-placeholder{display:flex;flex-direction:column;align-items:center;gap:var(--spacing-sm)}
.upload-placeholder svg{width:48px;height:48px;color:var(--text-muted)}
.upload-text{font-weight:600;color:var(--text)}
.upload-hint{font-size:var(--font-size-xs);color:var(--text-muted)}
.upload-progress{display:flex;flex-direction:column;align-items:center;gap:var(--spacing-md)}
.upload-progress span{font-size:var(--font-size-sm);color:var(--text-muted)}

/* Empty Photos */
.empty-photos{text-align:center;padding:var(--spacing-xl);background:var(--background);border-radius:var(--radius-lg);color:var(--text-muted);margin-top:var(--spacing-md)}
.empty-photos svg{width:48px;height:48px;color:var(--text-muted);margin-bottom:var(--spacing-sm)}

/* Input with button */
.input-with-button{display:flex;gap:var(--spacing-sm)}
.input-with-button .form-input{flex:1}
.add-photo-section,.add-tag-section{margin-bottom:var(--spacing-lg)}

/* Tags */
.tags-container{display:flex;flex-wrap:wrap;gap:var(--spacing-sm);margin-bottom:var(--spacing-lg)}
.tag{display:inline-flex;align-items:center;gap:var(--spacing-xs);padding:8px 14px;background:var(--background);border-radius:var(--radius-full);font-size:var(--font-size-sm)}
.tag-highlight{background:#fef3c7;color:#92400e}
.tag-icon{width:14px;height:14px;color:#f59e0b}
.tag-remove{background:none;border:none;font-size:16px;cursor:pointer;color:var(--text-muted);margin-left:4px}
.tag-remove:hover{color:var(--error)}

/* Danger Zone */
.danger-icon{width:20px;height:20px;color:#dc2626;display:inline;vertical-align:middle;margin-right:var(--spacing-xs)}

/* Suggestions */
.suggestions-section{margin-top:var(--spacing-lg)}
.suggestions-label{font-size:var(--font-size-xs);color:var(--text-muted);margin-bottom:var(--spacing-sm)}
.suggestions-grid{display:flex;flex-wrap:wrap;gap:var(--spacing-xs)}
.suggestion-btn{padding:6px 12px;background:white;border:1px solid var(--border);border-radius:var(--radius-full);font-size:var(--font-size-xs);cursor:pointer;transition:all var(--transition-fast)}
.suggestion-btn:hover:not(:disabled){background:var(--primary);color:white;border-color:var(--primary)}
.suggestion-btn.added{background:var(--success-bg);border-color:var(--success);color:var(--success)}
.suggestion-btn:disabled{cursor:not-allowed;opacity:0.7}

/* Toggle Switch */
.toggle-setting{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--spacing-lg)}
.toggle-info strong{display:block;margin-bottom:var(--spacing-xs)}
.toggle-info p{margin:0;font-size:var(--font-size-sm);color:var(--text-muted)}
.toggle-switch{position:relative;width:52px;height:28px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;transition:.3s;border-radius:28px}
.toggle-slider:before{position:absolute;content:"";height:22px;width:22px;left:3px;bottom:3px;background:white;transition:.3s;border-radius:50%}
.toggle-switch input:checked+.toggle-slider{background:var(--primary)}
.toggle-switch input:checked+.toggle-slider:before{transform:translateX(24px)}

/* Danger Zone */
.danger-zone{border:2px solid #fecaca}
.danger-zone .section-title{color:#dc2626}
.btn-danger{background:#dc2626;color:white;border:none;padding:var(--spacing-sm) var(--spacing-lg);border-radius:var(--radius-lg);cursor:pointer}
.btn-danger:disabled{opacity:0.5;cursor:not-allowed}

/* Photo Counter */
.photo-counter{margin-bottom:var(--spacing-sm);text-align:right}
.photo-counter span{font-size:var(--font-size-sm);color:var(--text-secondary);font-weight:500}
.photo-counter span.max-reached{color:#dc2626;font-weight:600}
.upload-box.disabled{opacity:0.6;cursor:not-allowed;border-color:var(--border)}
.upload-box.disabled:hover{border-color:var(--border);background:var(--background)}
.upload-placeholder.max-reached{color:#059669}
.upload-placeholder.max-reached svg{color:#059669}

/* Responsive */
@media(max-width:1024px){
  .stats-row{grid-template-columns:repeat(2,1fr)}
  .form-row{grid-template-columns:1fr}
}
@media(max-width:768px){
  .dashboard{flex-direction:column}
  .main{padding:var(--spacing-md)}
  .header{flex-direction:column;align-items:stretch}
  .header-actions{justify-content:space-between}
  .stats-row{grid-template-columns:1fr 1fr}
  .tabs{overflow-x:auto}
  .tabs button{white-space:nowrap;font-size:var(--font-size-xs);padding:var(--spacing-sm)}
}
</style>
