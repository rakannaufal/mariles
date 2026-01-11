<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

// Form State
const profile = ref({
  // Basic Identity
  name: '',
  nickname: '',
  avatar_url: '',
  date_of_birth: '',
  gender: '',
  
  // Academic Info
  education_level: '',
  grade: '',
  school_name: '',
  curriculum: '',
  major: '',
  
  // Contact
  email: '',
  phone: '',
  
  // Guardian
  parent_name: '',
  parent_phone: '',
  
  // Address
  address: '',
  province_id: '',
  province_name: '',
  city_id: '',
  city_name: '',
  postal_code: ''
})

const loading = ref(true)
const saving = ref(false)
const message = ref({ type: '', text: '' })
const activeTab = ref('identity')

// Set to false to use real database data
const USE_DUMMY_DATA = false

// Flag to prevent resetting grade/major during initial load
const isInitialLoad = ref(true)

// Location Data
const provinces = ref([])
const cities = ref([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)

// Options
const genderOptions = [
  { value: '', label: 'Pilih jenis kelamin' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' }
]

const educationLevelOptions = [
  { value: '', label: 'Pilih jenjang pendidikan' },
  { value: 'SD', label: 'SD (Sekolah Dasar)' },
  { value: 'SMP', label: 'SMP (Sekolah Menengah Pertama)' },
  { value: 'SMA', label: 'SMA (Sekolah Menengah Atas)' },
  { value: 'SMK', label: 'SMK (Sekolah Menengah Kejuruan)' },
  { value: 'Kuliah', label: 'Kuliah (Perguruan Tinggi)' },
  { value: 'Umum', label: 'Umum / Profesional' }
]

const gradeOptionsMap = {
  SD: [
    { value: 'Kelas 1', label: 'Kelas 1' },
    { value: 'Kelas 2', label: 'Kelas 2' },
    { value: 'Kelas 3', label: 'Kelas 3' },
    { value: 'Kelas 4', label: 'Kelas 4' },
    { value: 'Kelas 5', label: 'Kelas 5' },
    { value: 'Kelas 6', label: 'Kelas 6' }
  ],
  SMP: [
    { value: 'Kelas 7', label: 'Kelas 7' },
    { value: 'Kelas 8', label: 'Kelas 8' },
    { value: 'Kelas 9', label: 'Kelas 9' }
  ],
  SMA: [
    { value: 'Kelas 10', label: 'Kelas 10' },
    { value: 'Kelas 11', label: 'Kelas 11' },
    { value: 'Kelas 12', label: 'Kelas 12' }
  ],
  SMK: [
    { value: 'Kelas 10', label: 'Kelas 10' },
    { value: 'Kelas 11', label: 'Kelas 11' },
    { value: 'Kelas 12', label: 'Kelas 12' }
  ],
  Kuliah: [
    { value: 'Semester 1', label: 'Semester 1' },
    { value: 'Semester 2', label: 'Semester 2' },
    { value: 'Semester 3', label: 'Semester 3' },
    { value: 'Semester 4', label: 'Semester 4' },
    { value: 'Semester 5', label: 'Semester 5' },
    { value: 'Semester 6', label: 'Semester 6' },
    { value: 'Semester 7', label: 'Semester 7' },
    { value: 'Semester 8', label: 'Semester 8' },
    { value: 'Semester 8+', label: 'Semester 8+' }
  ],
  Umum: [
    { value: 'Umum', label: 'Umum' }
  ]
}

const curriculumOptions = [
  { value: '', label: 'Pilih kurikulum' },
  { value: 'Kurikulum Merdeka', label: 'Kurikulum Merdeka' },
  { value: 'K13', label: 'Kurikulum 2013 (K13)' },
  { value: 'Cambridge', label: 'Cambridge International' },
  { value: 'IB', label: 'International Baccalaureate (IB)' },
  { value: 'Other', label: 'Lainnya' }
]

const majorOptionsMap = {
  SMA: [
    { value: '', label: 'Pilih jurusan' },
    { value: 'IPA', label: 'IPA / Saintek' },
    { value: 'IPS', label: 'IPS / Soshum' },
    { value: 'Bahasa', label: 'Bahasa' }
  ],
  SMK: [
    { value: '', label: 'Pilih jurusan' },
    { value: 'Teknik', label: 'Teknik' },
    { value: 'Bisnis', label: 'Bisnis & Manajemen' },
    { value: 'Informatika', label: 'Informatika' },
    { value: 'Kesehatan', label: 'Kesehatan' },
    { value: 'Pariwisata', label: 'Pariwisata' },
    { value: 'Seni', label: 'Seni & Industri Kreatif' },
    { value: 'Other', label: 'Lainnya' }
  ],
  Kuliah: [
    { value: '', label: 'Pilih jurusan/fakultas' },
    { value: 'Teknik', label: 'Teknik' },
    { value: 'MIPA', label: 'MIPA / Sains' },
    { value: 'Kedokteran', label: 'Kedokteran' },
    { value: 'Ekonomi', label: 'Ekonomi & Bisnis' },
    { value: 'Hukum', label: 'Hukum' },
    { value: 'FISIP', label: 'Ilmu Sosial & Politik' },
    { value: 'Sastra', label: 'Sastra & Budaya' },
    { value: 'Pendidikan', label: 'Pendidikan' },
    { value: 'Pertanian', label: 'Pertanian' },
    { value: 'Other', label: 'Lainnya' }
  ]
}

// Watch education level to reset grade (only when user changes it, not on initial load)
watch(() => profile.value.education_level, (newVal, oldVal) => {
  // Skip reset during initial profile loading
  if (isInitialLoad.value) return
  // Only reset if this is a user-initiated change
  if (oldVal !== '' && newVal !== oldVal) {
    profile.value.grade = ''
    profile.value.major = ''
  }
})

// Watch province to fetch cities
watch(() => profile.value.province_id, async (newVal) => {
  if (newVal) {
    await fetchCities(newVal)
  } else {
    cities.value = []
    profile.value.city_id = ''
    profile.value.city_name = ''
  }
})

onMounted(async () => {
  await Promise.all([fetchProfile(), fetchProvinces()])
})

// Fetch provinces from API
async function fetchProvinces() {
  loadingProvinces.value = true
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    provinces.value = await res.json()
  } catch (err) {
    console.error('Error fetching provinces:', err)
    // Fallback data
    provinces.value = [
      { id: '11', name: 'ACEH' },
      { id: '12', name: 'SUMATERA UTARA' },
      { id: '13', name: 'SUMATERA BARAT' },
      { id: '14', name: 'RIAU' },
      { id: '15', name: 'JAMBI' },
      { id: '16', name: 'SUMATERA SELATAN' },
      { id: '17', name: 'BENGKULU' },
      { id: '18', name: 'LAMPUNG' },
      { id: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
      { id: '21', name: 'KEPULAUAN RIAU' },
      { id: '31', name: 'DKI JAKARTA' },
      { id: '32', name: 'JAWA BARAT' },
      { id: '33', name: 'JAWA TENGAH' },
      { id: '34', name: 'DI YOGYAKARTA' },
      { id: '35', name: 'JAWA TIMUR' },
      { id: '36', name: 'BANTEN' },
      { id: '51', name: 'BALI' },
      { id: '52', name: 'NUSA TENGGARA BARAT' },
      { id: '53', name: 'NUSA TENGGARA TIMUR' },
      { id: '61', name: 'KALIMANTAN BARAT' },
      { id: '62', name: 'KALIMANTAN TENGAH' },
      { id: '63', name: 'KALIMANTAN SELATAN' },
      { id: '64', name: 'KALIMANTAN TIMUR' },
      { id: '65', name: 'KALIMANTAN UTARA' },
      { id: '71', name: 'SULAWESI UTARA' },
      { id: '72', name: 'SULAWESI TENGAH' },
      { id: '73', name: 'SULAWESI SELATAN' },
      { id: '74', name: 'SULAWESI TENGGARA' },
      { id: '75', name: 'GORONTALO' },
      { id: '76', name: 'SULAWESI BARAT' },
      { id: '81', name: 'MALUKU' },
      { id: '82', name: 'MALUKU UTARA' },
      { id: '91', name: 'PAPUA BARAT' },
      { id: '94', name: 'PAPUA' }
    ]
  } finally {
    loadingProvinces.value = false
  }
}

// Fetch cities from API
async function fetchCities(provinceId) {
  loadingCities.value = true
  cities.value = []
  profile.value.city_id = ''
  
  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`)
    cities.value = await res.json()
  } catch (err) {
    console.error('Error fetching cities:', err)
  } finally {
    loadingCities.value = false
  }
}

// Handle province change
function onProvinceChange(e) {
  const selectedId = e.target.value
  const selectedProvince = provinces.value.find(p => p.id === selectedId)
  profile.value.province_id = selectedId
  profile.value.province_name = selectedProvince?.name || ''
}

// Handle city change
function onCityChange(e) {
  const selectedId = e.target.value
  const selectedCity = cities.value.find(c => c.id === selectedId)
  profile.value.city_id = selectedId
  profile.value.city_name = selectedCity?.name || ''
}

async function fetchProfile() {
  loading.value = true
  
  try {
    // Wait for auth
    while (authStore.loading) {
      await new Promise(r => setTimeout(r, 100))
    }
    
    if (USE_DUMMY_DATA) {

      profile.value = {
        name: 'Ahmad Rizky',
        nickname: 'Rizky',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        date_of_birth: '2008-05-15',
        gender: 'male',
        education_level: 'SMA',
        grade: 'Kelas 11',
        school_name: 'SMA Negeri 1 Jakarta',
        curriculum: 'Kurikulum Merdeka',
        major: 'IPA',
        email: 'ahmad.rizky@email.com',
        phone: '081234567890',
        parent_name: 'Budi Santoso',
        parent_phone: '081987654321',
        address: 'Jl. Merdeka No. 123',
        province_id: '31',
        province_name: 'DKI JAKARTA',
        city_id: '3171',
        city_name: 'KOTA JAKARTA SELATAN',
        postal_code: '12760'
      }
      // Fetch cities for selected province
      if (profile.value.province_id) {
        await fetchCities(profile.value.province_id)
      }
      return
    }
    
    if (authStore.userProfile) {
      profile.value.name = authStore.userProfile.name || ''
      profile.value.email = authStore.userProfile.email || authStore.user?.email || ''
      profile.value.phone = authStore.userProfile.phone || ''
      profile.value.avatar_url = authStore.userProfile.avatar_url || ''
      // Fallback for gender and birth_date from users table (for legacy registrations)
      profile.value.gender = authStore.userProfile.gender || ''
      profile.value.date_of_birth = authStore.userProfile.birth_date || ''
    }
    
    if (authStore.user) {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', authStore.user.id)
        .single()
      
      if (studentData) {
        profile.value = {
          ...profile.value,
          nickname: studentData.nickname || profile.value.nickname || '',
          // Prefer students table data, fallback to users table data
          date_of_birth: studentData.date_of_birth || profile.value.date_of_birth || '',
          gender: studentData.gender || profile.value.gender || '',
          education_level: studentData.education_level || '',
          grade: studentData.grade || '',
          school_name: studentData.school || studentData.school_name || '',
          curriculum: studentData.curriculum || '',
          major: studentData.major || '',
          parent_name: studentData.parent_name || '',
          parent_phone: studentData.parent_phone || '',
          address: studentData.address || '',
          province_id: studentData.province_id || '',
          province_name: studentData.province_name || '',
          city_id: studentData.city_id || '',
          city_name: studentData.city_name || '',
          postal_code: studentData.postal_code || ''
        }
        
        // Fetch cities for selected province
        if (studentData.province_id) {
          await fetchCities(studentData.province_id)
        }
      }
    }
  } catch (err) {
    console.error('Error loading profile:', err)
  } finally {
    loading.value = false
    // Allow watchers to reset fields now that initial load is complete
    isInitialLoad.value = false
  }
}

async function handleSave() {
  saving.value = true
  message.value = { type: '', text: '' }

  try {
    if (USE_DUMMY_DATA) {
      await new Promise(r => setTimeout(r, 1000))
      message.value = { type: 'success', text: 'Profil berhasil disimpan!' }
      setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
      return
    }
    
    // Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: profile.value.name,
        phone: profile.value.phone || null
      })
      .eq('id', authStore.user.id)

    if (userError) throw userError

    // Update students table
    const { error: studentError } = await supabase
      .from('students')
      .update({
        nickname: profile.value.nickname || null,
        date_of_birth: profile.value.date_of_birth || null,
        gender: profile.value.gender || null,
        education_level: profile.value.education_level || null,
        grade: profile.value.grade || null,
        school: profile.value.school_name || null,
        school_name: profile.value.school_name || null,
        curriculum: profile.value.curriculum || null,
        major: profile.value.major || null,
        parent_name: profile.value.parent_name || null,
        parent_phone: profile.value.parent_phone || null,
        address: profile.value.address || null,
        province_id: profile.value.province_id || null,
        province_name: profile.value.province_name || null,
        city_id: profile.value.city_id || null,
        city_name: profile.value.city_name || null,
        postal_code: profile.value.postal_code || null
      })
      .eq('user_id', authStore.user.id)

    if (studentError) throw studentError

    await authStore.fetchUserProfile()
    message.value = { type: 'success', text: 'Profil berhasil disimpan!' }
    setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
  } catch (err) {
    console.error('Save error:', err)
    message.value = { type: 'error', text: 'Gagal menyimpan: ' + err.message }
  } finally {
    saving.value = false
  }
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    if (USE_DUMMY_DATA) {
      const reader = new FileReader()
      reader.onload = (e) => {
        profile.value.avatar_url = e.target.result
        message.value = { type: 'success', text: 'Foto profil berhasil diubah!' }
        setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
      }
      reader.readAsDataURL(file)
      return
    }
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${authStore.user.id}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', authStore.user.id)

    if (updateError) throw updateError

    profile.value.avatar_url = publicUrl
    await authStore.fetchUserProfile()
    message.value = { type: 'success', text: 'Foto profil berhasil diupload!' }
  } catch (err) {
    message.value = { type: 'error', text: 'Gagal upload: ' + err.message }
  }
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

async function deleteAccount() {
  if (!confirm('Yakin ingin menghapus akun? Semua data akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.')) return
  if (!confirm('Apakah Anda benar-benar yakin? Data tidak dapat dipulihkan kembali.')) return
  
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: authStore.user.id }
    })

    if (error) throw error
    if (data && !data.success) throw new Error(data.error || 'Gagal menghapus akun')
    
    await authStore.signOut()
    router.push('/')
  } catch (err) {
    console.error('Delete account error:', err)
    message.value = { type: 'error', text: 'Gagal menghapus akun: ' + err.message }
  }
}
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="page-header">
        <h1>Profil Saya</h1>
        <p>Lengkapi data profil untuk pengalaman belajar yang lebih personal</p>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Memuat profil...</p>
      </div>

      <div v-else class="profile-layout">
        <!-- Left: Avatar Card -->
        <aside class="profile-sidebar">
          <div class="avatar-card">
            <div class="avatar">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.name">
              <span v-else class="avatar-placeholder">{{ profile.name?.charAt(0)?.toUpperCase() || '?' }}</span>
            </div>
            <h3>{{ profile.name || 'Nama Siswa' }}</h3>
            <p class="nickname" v-if="profile.nickname">"{{ profile.nickname }}"</p>
            <p class="email">{{ profile.email }}</p>
            <label class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Ubah Foto
              <input type="file" accept="image/*" hidden @change="handleAvatarUpload">
            </label>
          </div>

          <div class="info-card">
            <h4>Status Akun</h4>
            <div class="info-item">
              <span class="label">Role</span>
              <span class="value badge-student">Siswa</span>
            </div>
            <div class="info-item" v-if="profile.date_of_birth">
              <span class="label">Usia</span>
              <span class="value">{{ calculateAge(profile.date_of_birth) }} tahun</span>
            </div>
            <div class="info-item" v-if="profile.education_level">
              <span class="label">Jenjang</span>
              <span class="value">{{ profile.education_level }}</span>
            </div>
            <div class="info-item">
              <span class="label">Bergabung</span>
              <span class="value">{{ new Date(authStore.user?.created_at || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) }}</span>
            </div>
          </div>
        </aside>

        <!-- Right: Form -->
        <div class="profile-form-container">
          <div v-if="message.text" class="alert" :class="message.type">
            <svg v-if="message.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            {{ message.text }}
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button :class="['tab', { active: activeTab === 'identity' }]" @click="activeTab = 'identity'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Identitas
            </button>
            <button :class="['tab', { active: activeTab === 'academic' }]" @click="activeTab = 'academic'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              Akademik
            </button>
            <button :class="['tab', { active: activeTab === 'contact' }]" @click="activeTab = 'contact'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Kontak & Wali
            </button>
            <button :class="['tab', { active: activeTab === 'account' }]" @click="activeTab = 'account'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Akun
            </button>
          </div>

          <form class="profile-form" @submit.prevent="handleSave">
            <!-- Tab: Identity -->
            <div v-show="activeTab === 'identity'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Identitas Dasar</h3>
                  <p>Data penting untuk mengenali siswa di dalam sistem</p>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Nama Lengkap <span class="required">*</span></label>
                    <input v-model="profile.name" type="text" placeholder="Masukkan nama lengkap">
                    <span class="hint">Untuk keperluan administrasi dan sertifikat</span>
                  </div>
                  <div class="form-group">
                    <label>Nama Panggilan</label>
                    <input v-model="profile.nickname" type="text" placeholder="Nama panggilan">
                    <span class="hint">Agar tutor bisa menyapa dengan akrab</span>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Tanggal Lahir</label>
                    <input v-model="profile.date_of_birth" type="date">
                  </div>
                  <div class="form-group">
                    <label>Jenis Kelamin</label>
                    <select v-model="profile.gender">
                      <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: Academic -->
            <div v-show="activeTab === 'academic'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Akademik</h3>
                  <p>Data penting untuk mencocokkan dengan tutor yang tepat</p>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Jenjang Pendidikan <span class="required">*</span></label>
                    <select v-model="profile.education_level">
                      <option v-for="opt in educationLevelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Tingkat / Kelas</label>
                    <select v-model="profile.grade" :disabled="!profile.education_level">
                      <option value="">Pilih kelas</option>
                      <option v-for="opt in (gradeOptionsMap[profile.education_level] || [])" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>Nama Sekolah / Universitas</label>
                  <input v-model="profile.school_name" type="text" placeholder="Contoh: SMA Negeri 1 Jakarta">
                  <span class="hint">Untuk mengetahui standar kurikulum yang dipakai</span>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Kurikulum</label>
                    <select v-model="profile.curriculum">
                      <option v-for="opt in curriculumOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-group" v-if="['SMA', 'SMK', 'Kuliah'].includes(profile.education_level)">
                    <label>Jurusan</label>
                    <select v-model="profile.major">
                      <option v-for="opt in (majorOptionsMap[profile.education_level] || [])" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                </div>

                <div class="info-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <p>Lengkapi data akademik untuk mendapatkan rekomendasi tempat les dan materi yang sesuai dengan tingkat pendidikan kamu.</p>
                </div>
              </div>
            </div>

            <!-- Tab: Contact -->
            <div v-show="activeTab === 'contact'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Kontak Siswa</h3>
                  <p>Untuk komunikasi jadwal dan informasi penting</p>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Email</label>
                    <input :value="profile.email" type="email" disabled>
                    <span class="hint">Email tidak dapat diubah</span>
                  </div>
                  <div class="form-group">
                    <label>No. WhatsApp / HP</label>
                    <input v-model="profile.phone" type="tel" placeholder="08xxxxxxxxxx">
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Orang Tua / Wali</h3>
                  <p>Wajib diisi jika siswa di bawah 17 tahun</p>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Nama Orang Tua / Wali</label>
                    <input v-model="profile.parent_name" type="text" placeholder="Nama lengkap orang tua/wali">
                  </div>
                  <div class="form-group">
                    <label>No. WhatsApp Orang Tua</label>
                    <input v-model="profile.parent_phone" type="tel" placeholder="08xxxxxxxxxx">
                    <span class="hint">Untuk laporan perkembangan belajar</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">
                  <h3>Alamat Lengkap</h3>
                  <p>Untuk keperluan les offline dan pengiriman materi</p>
                </div>

                <div class="form-group">
                  <label>Alamat</label>
                  <textarea v-model="profile.address" rows="2" placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Provinsi</label>
                    <select :value="profile.province_id" @change="onProvinceChange" :disabled="loadingProvinces">
                      <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih provinsi' }}</option>
                      <option v-for="prov in provinces" :key="prov.id" :value="prov.id">{{ prov.name }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Kota / Kabupaten</label>
                    <select :value="profile.city_id" @change="onCityChange" :disabled="!profile.province_id || loadingCities">
                      <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih kota/kabupaten' }}</option>
                      <option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option>
                    </select>
                  </div>
                </div>

                <div class="form-group" style="max-width: 200px;">
                  <label>Kode Pos</label>
                  <input v-model="profile.postal_code" type="text" placeholder="Kode pos" maxlength="5">
                </div>
              </div>

              <div class="info-box blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <p>No. WhatsApp orang tua akan digunakan untuk konfirmasi pendaftaran, laporan perkembangan belajar, dan informasi pembayaran.</p>
              </div>
            </div>

            <!-- Tab: Account -->
            <div v-show="activeTab === 'account'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Pengaturan Akun</h3>
                  <p>Kelola keamanan dan status akun Anda</p>
                </div>
                
                <div class="account-card danger">
                  <h4>Hapus Akun</h4>
                  <p>Menghapus akun Anda secara permanen. Semua data histori les, transaksi, dan profil akan hilang dan tidak dapat dikembalikan.</p>
                  <button type="button" class="btn-delete-account" @click="deleteAccount">Hapus Akun Permanen</button>
                </div>
              </div>
            </div>

            <!-- Submit -->
            <div class="form-actions">
              <button type="submit" class="btn-save" :disabled="saving">
                <svg v-if="!saving" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                {{ saving ? 'Menyimpan...' : 'Simpan Profil' }}
              </button>
            </div>
          </form>
        </div>
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

.loading-state{display:flex;flex-direction:column;align-items:center;padding:60px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px}
@keyframes spin{to{transform:rotate(360deg)}}

.profile-layout{display:grid;grid-template-columns:280px 1fr;gap:24px}

.profile-sidebar{display:flex;flex-direction:column;gap:16px}

.avatar-card{background:white;border-radius:16px;padding:24px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.avatar{width:100px;height:100px;border-radius:50%;margin:0 auto 16px;background:var(--secondary);display:flex;align-items:center;justify-content:center;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
.avatar-placeholder{font-size:40px;color:white;font-weight:700}
.avatar-card h3{font-size:18px;font-weight:600;margin-bottom:4px}
.avatar-card .nickname{font-size:14px;color:var(--text-secondary);font-style:italic;margin-bottom:4px}
.avatar-card .email{font-size:13px;color:var(--text-muted);margin-bottom:16px}
.upload-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--background);color:var(--secondary);border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s}
.upload-btn:hover{background:var(--border)}
.upload-btn svg{width:16px;height:16px}

.info-card{background:white;border-radius:16px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.info-card h4{font-size:14px;font-weight:600;margin-bottom:16px}
.info-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-light)}
.info-item:last-child{border-bottom:none}
.info-item .label{font-size:13px;color:var(--text-secondary)}
.info-item .value{font-size:13px;font-weight:500}
.badge-student{background:rgba(59,130,246,0.1);color:#3b82f6;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}

.profile-form-container{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}

.alert{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:12px;margin-bottom:20px;font-size:14px;font-weight:500}
.alert svg{width:20px;height:20px;flex-shrink:0}
.alert.success{background:#dcfce7;color:#16a34a}
.alert.error{background:#fee2e2;color:#dc2626}

.tabs{display:flex;gap:8px;margin-bottom:24px;border-bottom:2px solid var(--border-light);padding-bottom:12px}
.tab{display:flex;align-items:center;gap:8px;padding:10px 16px;background:none;border:none;font-size:14px;font-weight:500;color:var(--text-secondary);cursor:pointer;border-radius:10px;transition:all 0.2s}
.tab svg{width:18px;height:18px}
.tab:hover{background:var(--background);color:var(--secondary)}
.tab.active{background:var(--secondary);color:white}

.form-section{margin-bottom:32px}
.section-header{margin-bottom:20px}
.section-header h3{font-size:18px;font-weight:600;margin-bottom:4px}
.section-header p{font-size:13px;color:var(--text-secondary)}

.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:14px;font-weight:500;margin-bottom:6px}
.required{color:#ef4444}
.form-group input,.form-group textarea,.form-group select{width:100%;padding:12px 14px;border:2px solid var(--border);border-radius:10px;font-size:14px;transition:border-color 0.2s}
.form-group input:focus,.form-group textarea:focus,.form-group select:focus{outline:none;border-color:var(--primary)}
.form-group input:disabled,.form-group select:disabled{background:var(--background);color:var(--text-muted);cursor:not-allowed}
.hint{font-size:11px;color:var(--text-muted);margin-top:4px;display:block}

.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}

.info-box{display:flex;align-items:flex-start;gap:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-top:20px}
.info-box svg{width:20px;height:20px;color:#16a34a;flex-shrink:0}
.info-box p{font-size:13px;color:#166534;line-height:1.5;margin:0}
.info-box.blue svg{color:#2563eb}

.account-card{background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0}
.account-card.danger{border-color:#fee2e2;background:#fffafa}
.account-card h4{font-size:16px;font-weight:600;margin-bottom:8px;color:#1e293b}
.account-card.danger h4{color:#dc2626}
.account-card p{font-size:14px;color:#64748b;margin-bottom:16px;line-height:1.5}
.account-card.danger p{color:#7f1d1d}
.btn-delete-account{padding:10px 20px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;transition:all 0.2s}
.btn-delete-account:hover{background:#b91c1c}
.info-box.blue p{color:#1e40af}

.form-actions{padding-top:24px;border-top:2px solid var(--border-light)}
.btn-save{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--secondary);color:white;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-save svg{width:18px;height:18px}
.btn-save:hover{background:var(--primary);transform:translateY(-2px);box-shadow:0 4px 12px rgba(10,69,104,0.3)}
.btn-save:disabled{opacity:0.6;cursor:not-allowed;transform:none}

@media(max-width:1024px){.profile-layout{grid-template-columns:1fr}.profile-sidebar{flex-direction:row;flex-wrap:wrap}.avatar-card,.info-card{flex:1;min-width:220px}}
@media(max-width:640px){.form-row{grid-template-columns:1fr}.tabs{flex-wrap:wrap}}
</style>
