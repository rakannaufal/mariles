<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

// Phase: 'role' → 'method' → 'form'
const phase = ref('role')
const step = ref(1)

// Basic Info
const name = ref('')
const nickname = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const showPassword = ref(false)
const confirmPassword = ref('')
const showConfirmPassword = ref(false)
const gender = ref('')
const birthDate = ref('')
const role = ref('')
const agreeTerms = ref(false)
const error = ref('')
const success = ref('')
const loading = ref(false)

// Academic Info (for students)
const educationLevel = ref('')
const grade = ref('')
const schoolName = ref('')

// Parent Info (for students)
const parentName = ref('')
const parentPhone = ref('')

// Teacher Invite Code
const inviteCode = ref('')
const validatingCode = ref(false)
const inviteCodeValid = ref(false)
const inviteCodeError = ref('')
const linkedLesPlace = ref(null)
const linkedOwner = ref(null)
const linkedInviteCode = ref(null)

// Owner Les Place Info
const lesPlaceName = ref('')
const lesPlaceDescription = ref('')
const lesPlaceType = ref('')
const lesPlaceAddress = ref('')
const ownerType = ref('') // 'pribadi' or 'umum'

const ownerTypeOptions = [
  { value: 'pribadi', label: 'Pribadi', description: 'Saya mengajar sendiri di tempat les saya' },
  { value: 'umum', label: 'Umum', description: 'Saya memiliki guru-guru yang mengajar di tempat les saya' }
]

// Location API
const provinces = ref([])
const cities = ref([])
const provinceId = ref('')
const provinceName = ref('')
const cityId = ref('')
const cityName = ref('')
const loadingProvinces = ref(false)
const loadingCities = ref(false)

const roles = [
  { value: 'student', label: 'Siswa/Orang Tua', description: 'Mencari tempat les untuk belajar' },
  { value: 'owner', label: 'Pemilik Bimbel', description: 'Mendaftarkan tempat les/bimbingan belajar' },
  { value: 'teacher', label: 'Guru/Tutor', description: 'Mengajar di tempat les atau privat' },
]

// Options
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
  SD: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
  SMP: ['Kelas 7', 'Kelas 8', 'Kelas 9'],
  SMA: ['Kelas 10', 'Kelas 11', 'Kelas 12'],
  SMK: ['Kelas 10', 'Kelas 11', 'Kelas 12'],
  Kuliah: ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8', 'Semester 8+'],
  Umum: ['Umum']
}

// Watch education level to reset grade
watch(educationLevel, () => {
  grade.value = ''
})

// Watch province to fetch cities
watch(provinceId, async (newVal) => {
  if (newVal) {
    await fetchCities(newVal)
  } else {
    cities.value = []
    cityId.value = ''
    cityName.value = ''
  }
})

onMounted(() => {
  fetchProvinces()
})

// Fetch provinces
async function fetchProvinces() {
  loadingProvinces.value = true
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    provinces.value = await res.json()
  } catch (err) {
    console.error('Error fetching provinces:', err)
    // Fallback
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

// Fetch cities
async function fetchCities(provId) {
  loadingCities.value = true
  cities.value = []
  cityId.value = ''
  cityName.value = ''
  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`)
    cities.value = await res.json()
  } catch (err) {
    console.error('Error fetching cities:', err)
  } finally {
    loadingCities.value = false
  }
}

function onProvinceChange(e) {
  const selected = provinces.value.find(p => p.id === e.target.value)
  provinceId.value = e.target.value
  provinceName.value = selected?.name || ''
}

function onCityChange(e) {
  const selected = cities.value.find(c => c.id === e.target.value)
  cityId.value = e.target.value
  cityName.value = selected?.name || ''
}

// Calculate age from birth date
function calculateAge(dob) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const isUnder17 = computed(() => {
  const age = calculateAge(birthDate.value)
  return age !== null && age < 17
})

// Total steps based on role
const totalSteps = computed(() => {
  if (role.value === 'student') return 5
  if (role.value === 'teacher') return 5
  if (role.value === 'owner') return 5 // Added step for les place info
  return 4
})

// Validations
const isStep1Valid = computed(() => 
  name.value.trim().length >= 3 && 
  email.value.includes('@') && 
  phone.value.length >= 10
)
const isStep2Valid = computed(() => 
  password.value.length >= 6 && 
  password.value === confirmPassword.value
)
const isStep3Valid = computed(() => 
  gender.value && birthDate.value
)
// Step 4 for student: Academic info
const isStep4ValidStudent = computed(() => 
  educationLevel.value && grade.value
)
// Step 4 for teacher: Invite code
const isStep4ValidTeacher = computed(() => inviteCodeValid.value)
// Step 4 for owner: Les place info  
const isStep4ValidOwner = computed(() => 
  lesPlaceName.value.trim().length >= 3 && 
  lesPlaceType.value && 
  ownerType.value &&
  cityId.value
)
// Step 5 for student/teacher/owner: Terms
const isStep5Valid = computed(() => agreeTerms.value)

function selectRole(selectedRole) {
  role.value = selectedRole
  localStorage.setItem('pendingRole', selectedRole)
  
  // Owner must select owner type first before choosing method
  if (selectedRole === 'owner') {
    phase.value = 'owner-type'
  } else if (selectedRole === 'teacher') {
    // Teacher must enter invite code first before choosing method
    phase.value = 'teacher-code'
  } else {
    phase.value = 'method'
  }
}

function selectOwnerType(type) {
  ownerType.value = type
  localStorage.setItem('pendingOwnerType', type)
  phase.value = 'method'
}

function selectMethod(method) {
  if (method === 'google') {
    handleGoogleSignUp()
  } else {
    phase.value = 'form'
  }
}

function backToRole() {
  phase.value = 'role'
  role.value = ''
  ownerType.value = ''
  inviteCode.value = ''
  inviteCodeValid.value = false
  inviteCodeError.value = ''
  linkedInviteCode.value = null
  linkedLesPlace.value = null
  linkedOwner.value = null
  localStorage.removeItem('pendingRole')
  localStorage.removeItem('pendingOwnerType')
  localStorage.removeItem('pendingInviteCode')
  localStorage.removeItem('pendingLesPlaceId')
  localStorage.removeItem('pendingOwnerId')
}

function backToOwnerType() {
  phase.value = 'owner-type'
}

function backToTeacherCode() {
  phase.value = 'teacher-code'
}

function proceedFromTeacherCode() {
  if (inviteCodeValid.value) {
    // Save invite code data to localStorage for Google OAuth
    localStorage.setItem('pendingInviteCode', linkedInviteCode.value.code)
    localStorage.setItem('pendingLesPlaceId', linkedInviteCode.value.les_place_id)
    localStorage.setItem('pendingOwnerId', linkedInviteCode.value.owner_id)
    phase.value = 'method'
  }
}

function backToMethod() {
  if (role.value === 'owner') {
    // For owners, go back to owner type selection
    phase.value = 'owner-type'
  } else if (role.value === 'teacher') {
    // For teachers, go back to invite code
    phase.value = 'teacher-code'
  } else {
    phase.value = 'method'
  }
  step.value = 1
}

function nextStep() { 
  if (step.value === 1 && isStep1Valid.value) step.value = 2
  else if (step.value === 2 && isStep2Valid.value) step.value = 3
  else if (step.value === 3 && isStep3Valid.value) step.value = 4
  else if (step.value === 4) {
    if (role.value === 'student' && isStep4ValidStudent.value) step.value = 5
    else if (role.value === 'teacher' && isStep4ValidTeacher.value) step.value = 5
    else if (role.value === 'owner' && isStep4ValidOwner.value) step.value = 5
  }
}

async function validateInviteCode() {
  if (!inviteCode.value || inviteCode.value.length < 6) {
    inviteCodeError.value = 'Kode harus 6 karakter'
    return
  }
  
  validatingCode.value = true
  inviteCodeError.value = ''
  inviteCodeValid.value = false
  linkedLesPlace.value = null
  linkedOwner.value = null
  linkedInviteCode.value = null
  
  try {
    // Gunakan RPC function untuk bypass RLS issues
    const { data: rpcResult, error } = await supabase.rpc('validate_invite_code', { 
      code_input: inviteCode.value.toUpperCase() 
    })
    
    if (error) throw error

    // Cek hasil logic dari RPC
    if (!rpcResult.success) {
      inviteCodeError.value = rpcResult.message
      return
    }

    const data = rpcResult.data
    
    // Store the invite code data
    linkedInviteCode.value = data
    linkedLesPlace.value = data.les_places
    linkedOwner.value = data.owners
    inviteCodeValid.value = true
  } catch (err) {
    console.error('Error validating invite code:', err)
    inviteCodeError.value = 'Gagal memvalidasi kode'
  } finally {
    validatingCode.value = false
  }
}

function prevStep() { 
  if (step.value > 1) step.value--
  else backToMethod()
}

// Check if email already exists in database
async function checkEmailExists(emailToCheck) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emailToCheck.toLowerCase())
      .maybeSingle()
    
    if (error) {
      console.error('Error checking email:', error)
      return false
    }
    
    return !!data
  } catch (err) {
    console.error('Error checking email:', err)
    return false
  }
}


import { translateError } from '@/utils/errorTranslator'

// ... (code omitted)

async function handleRegister() {
  if (!isStep5Valid.value) return
  
  // For teacher, ensure invite code is valid
  if (role.value === 'teacher' && !inviteCodeValid.value) {
    error.value = 'Kode les tidak valid'
    return
  }
  
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Check if email already exists
    const emailExists = await checkEmailExists(email.value)
    if (emailExists) {
      error.value = 'Email sudah terdaftar! Silakan gunakan email lain atau login dengan akun yang sudah ada.'
      loading.value = false
      return
    }
    
    const profileData = {
      name: name.value,
      role: role.value,
      phone: phone.value,
      gender: gender.value,
      birth_date: birthDate.value,
      nickname: nickname.value || null,
      // Student specific
      education_level: role.value === 'student' ? educationLevel.value : null,
      grade: role.value === 'student' ? grade.value : null,
      school_name: role.value === 'student' ? schoolName.value : null,
      parent_name: role.value === 'student' ? parentName.value : null,
      parent_phone: role.value === 'student' ? parentPhone.value : null,
      province_id: provinceId.value || null,
      province_name: provinceName.value || null,
      city_id: cityId.value || null,
      city_name: cityName.value || null,
      // Teacher specific - include owner_id and invite code
      les_place_id: role.value === 'teacher' && linkedInviteCode.value ? linkedInviteCode.value.les_place_id : null,
      owner_id: role.value === 'teacher' && linkedInviteCode.value ? linkedInviteCode.value.owner_id : null,
      invite_code: role.value === 'teacher' && linkedInviteCode.value ? linkedInviteCode.value.code : null,
      // Owner specific - les place info stored separately
      les_place_name: role.value === 'owner' ? lesPlaceName.value : null,
      les_place_description: role.value === 'owner' ? lesPlaceDescription.value : null,
      les_place_type: role.value === 'owner' ? lesPlaceType.value : null,
      les_place_address: role.value === 'owner' ? lesPlaceAddress.value : null,
      owner_type: role.value === 'owner' ? ownerType.value : null
    }
    
    const result = await authStore.signUp(email.value, password.value, profileData)
    
    if (result.user && !result.session) {
      success.value = 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.'
    } else if (result.session) {
      localStorage.removeItem('pendingRole')
      if (role.value === 'student') {
        router.push('/')
      } else {
        router.push(`/${role.value}/dashboard`)
      }
    } else {
      router.push('/login?registered=true')
    }
  } catch (err) {
    console.error('Registration error:', err)
    // Handle specific Supabase error for duplicate email
    if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
      error.value = 'Email sudah terdaftar! Silakan gunakan email lain atau login dengan akun yang sudah ada.'
    } else {
      error.value = translateError(err.message)
    }
  } finally {
    loading.value = false
  }
}

async function handleGoogleSignUp() {
  loading.value = true
  try { 
    await authStore.signInWithGoogle() 
  }
  catch (err) { 
    error.value = translateError(err.message)
    loading.value = false
  }
}

function getRoleLabel(value) {
  return roles.find(r => r.value === value)?.label || value
}

function getStepLabels() {
  if (role.value === 'student') {
    return ['Info', 'Password', 'Pribadi', 'Akademik', 'Selesai']
  }
  if (role.value === 'teacher') {
    return ['Info', 'Password', 'Pribadi', 'Kode Les', 'Selesai']
  }
  if (role.value === 'owner') {
    return ['Info', 'Password', 'Pribadi', 'Tempat Les', 'Selesai']
  }
  return ['Info', 'Password', 'Pribadi', 'Selesai']
}
</script>

<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-form-container">
        <div class="register-form-wrapper">
          <div class="form-header">
            <router-link to="/" class="logo"><span class="logo-text">Mariles</span></router-link>
            <h2>{{ phase === 'role' ? 'Daftar sebagai apa?' : phase === 'method' ? 'Pilih Metode Pendaftaran' : 'Lengkapi Data Anda' }}</h2>
            <p>Sudah punya akun? <router-link to="/login" class="link">Masuk</router-link></p>
          </div>

          <div v-if="error" class="alert alert-error">{{ error }}</div>
          <div v-if="success" class="alert alert-success">{{ success }}</div>

          <!-- Phase 1: Role Selection -->
          <div v-if="phase === 'role'" class="phase-content animate-fade-in">
            <div class="role-selection">
              <div v-for="r in roles" :key="r.value" class="role-card" @click="selectRole(r.value)">
                <div class="role-info">
                  <span class="role-label">{{ r.label }}</span>
                  <span class="role-desc">{{ r.description }}</span>
                </div>
                <span class="role-arrow">→</span>
              </div>
            </div>
          </div>

          <!-- Phase 1.5: Owner Type Selection (NEW - Only for Owners) -->
          <div v-if="phase === 'owner-type'" class="phase-content animate-fade-in">
            <div class="selected-role-badge">
              <span>Mendaftar sebagai:</span>
              <strong>{{ getRoleLabel(role) }}</strong>
              <button class="change-role-btn" @click="backToRole">Ubah</button>
            </div>

            <div class="owner-type-selection">
              <h3 class="selection-title">Pilih Jenis Tempat Les</h3>
              <p class="selection-desc">Tentukan bagaimana Anda akan mengelola tempat les Anda</p>
              
              <div class="owner-type-cards-large">
                <div 
                  class="owner-type-card-large" 
                  @click="selectOwnerType('pribadi')"
                >
                  <div class="card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div class="card-content">
                    <strong>Pribadi</strong>
                    <p>Saya mengajar sendiri di tempat les saya. Tidak ada guru lain yang mengajar.</p>
                  </div>
                  <span class="card-arrow">→</span>
                </div>
                
                <div 
                  class="owner-type-card-large" 
                  @click="selectOwnerType('umum')"
                >
                  <div class="card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div class="card-content">
                    <strong>Umum</strong>
                    <p>Saya memiliki satu atau lebih guru yang mengajar di tempat les saya.</p>
                  </div>
                  <span class="card-arrow">→</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase 1.6: Teacher Invite Code (Only for Teachers) -->
          <div v-if="phase === 'teacher-code'" class="phase-content animate-fade-in">
            <div class="selected-role-badge">
              <span>Mendaftar sebagai:</span>
              <strong>{{ getRoleLabel(role) }}</strong>
              <button class="change-role-btn" @click="backToRole">Ubah</button>
            </div>

            <div class="teacher-code-section">
              <h3 class="selection-title">Masukkan Kode Undangan</h3>
              <p class="selection-desc">Masukkan kode undangan yang diberikan oleh pemilik tempat les</p>
              
              <div class="invite-code-form">
                <div class="form-group">
                  <input 
                    v-model="inviteCode" 
                    type="text" 
                    class="form-input invite-code-input" 
                    placeholder="Masukkan kode 6 karakter"
                    maxlength="6"
                    @input="inviteCode = inviteCode.toUpperCase()"
                  >
                  <button 
                    type="button" 
                    class="btn btn-secondary validate-btn"
                    @click="validateInviteCode"
                    :disabled="validatingCode || inviteCode.length < 6"
                  >
                    <span v-if="validatingCode">Memvalidasi...</span>
                    <span v-else>Validasi</span>
                  </button>
                </div>
                
                <div v-if="inviteCodeError" class="invite-error">{{ inviteCodeError }}</div>
                
                <div v-if="inviteCodeValid && linkedLesPlace" class="invite-success">
                  <span class="success-icon">✓</span>
                  <div class="success-info">
                    <strong>Kode Valid!</strong>
                    <p>Anda akan bergabung dengan: <strong>{{ linkedLesPlace.name }}</strong></p>
                    <p v-if="linkedOwner">Pemilik: {{ linkedOwner.users?.name || linkedOwner.business_name }}</p>
                  </div>
                </div>
              </div>
              
              <div class="action-buttons">
                <button type="button" class="btn btn-outline" @click="backToRole">Kembali</button>
                <button 
                  type="button" 
                  class="btn btn-secondary"
                  @click="proceedFromTeacherCode"
                  :disabled="!inviteCodeValid"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>

          <!-- Phase 2: Method Selection -->
          <div v-if="phase === 'method'" class="phase-content animate-fade-in">
            <div class="selected-role-badge">
              <span>Mendaftar sebagai:</span>
              <strong>{{ getRoleLabel(role) }}</strong>
              <template v-if="role === 'owner'">
                <span class="badge-separator">•</span>
                <strong>{{ ownerType === 'pribadi' ? 'Pribadi' : 'Umum' }}</strong>
              </template>
              <template v-if="role === 'teacher' && linkedLesPlace">
                <span class="badge-separator">•</span>
                <strong>{{ linkedLesPlace.name }}</strong>
              </template>
              <button class="change-role-btn" @click="role === 'owner' ? backToOwnerType() : role === 'teacher' ? backToTeacherCode() : backToRole()">Ubah</button>
            </div>

            <div class="method-selection">
              <div class="method-card" @click="selectMethod('manual')">
                <div class="method-info">
                  <span class="method-label">Daftar dengan Email</span>
                  <span class="method-desc">Isi form pendaftaran lengkap</span>
                </div>
                <span class="method-arrow">→</span>
              </div>

              <div class="method-divider">atau</div>

              <button class="btn btn-outline w-full social-btn method-google" @click="selectMethod('google')" :disabled="loading">
                <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span v-if="loading">Menghubungkan...</span>
                <span v-else>Daftar dengan Google</span>
              </button>
            </div>

          </div>

          <!-- Phase 3: Manual Form -->
          <div v-if="phase === 'form'" class="phase-content animate-fade-in">
            <div class="selected-role-badge compact">
              <span>{{ getRoleLabel(role) }}</span>
              <button class="change-role-btn" @click="backToRole">Ubah Role</button>
            </div>

            <!-- Progress Steps -->
            <div class="progress-steps">
              <div v-for="(label, i) in getStepLabels()" :key="i" class="progress-step" :class="{ active: step >= i + 1, completed: step > i + 1 }">
                <div class="step-circle"><span v-if="step > i + 1">✓</span><span v-else>{{ i + 1 }}</span></div>
                <span class="step-label">{{ label }}</span>
              </div>
            </div>

            <form @submit.prevent="handleRegister" class="register-form">
              <!-- Step 1: Info Dasar -->
              <div v-if="step === 1" class="form-step animate-fade-in">
                <div class="form-group">
                  <label class="form-label">Nama Lengkap <span class="required">*</span></label>
                  <input v-model="name" type="text" class="form-input" placeholder="Masukkan nama lengkap">
                </div>
                <div class="form-group" v-if="role === 'student'">
                  <label class="form-label">Nama Panggilan <span class="optional">(Opsional)</span></label>
                  <input v-model="nickname" type="text" class="form-input" placeholder="Nama panggilan">
                </div>
                <div class="form-group">
                  <label class="form-label">Email <span class="required">*</span></label>
                  <input v-model="email" type="email" class="form-input" placeholder="nama@email.com">
                </div>
                <div class="form-group">
                  <label class="form-label">No. WhatsApp <span class="required">*</span></label>
                  <input v-model="phone" type="tel" class="form-input" placeholder="08xxxxxxxxxx">
                </div>
                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep1Valid" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 2: Password -->
              <div v-if="step === 2" class="form-step animate-fade-in">
                <div class="form-group">
                  <label class="form-label">Password <span class="required">*</span></label>
                  <div class="password-wrapper">
                    <input 
                      v-model="password" 
                      :type="showPassword ? 'text' : 'password'" 
                      class="form-input password-input" 
                      placeholder="Minimal 6 karakter"
                    >
                    <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                      <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" class="toggle-icon">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" class="toggle-icon">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Konfirmasi Password <span class="required">*</span></label>
                  <div class="password-wrapper">
                    <input 
                      v-model="confirmPassword" 
                      :type="showConfirmPassword ? 'text' : 'password'" 
                      class="form-input password-input" 
                      placeholder="Ulangi password" 
                      :class="{ error: confirmPassword && password !== confirmPassword }"
                    >
                    <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                      <svg v-if="!showConfirmPassword" viewBox="0 0 24 24" fill="none" class="toggle-icon">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" class="toggle-icon">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                  <span v-if="confirmPassword && password !== confirmPassword" class="form-error">Password tidak cocok</span>
                </div>
                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep2Valid" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 3: Data Pribadi -->
              <div v-if="step === 3" class="form-step animate-fade-in">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Jenis Kelamin <span class="required">*</span></label>
                    <select v-model="gender" class="form-input">
                      <option value="">Pilih</option>
                      <option value="male">Laki-laki</option>
                      <option value="female">Perempuan</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tanggal Lahir <span class="required">*</span></label>
                    <input v-model="birthDate" type="date" class="form-input">
                  </div>
                </div>
                
                <!-- Location for student -->
                <template v-if="role === 'student'">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Provinsi</label>
                      <select :value="provinceId" @change="onProvinceChange" class="form-input" :disabled="loadingProvinces">
                        <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih provinsi' }}</option>
                        <option v-for="prov in provinces" :key="prov.id" :value="prov.id">{{ prov.name }}</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Kota / Kabupaten</label>
                      <select :value="cityId" @change="onCityChange" class="form-input" :disabled="!provinceId || loadingCities">
                        <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih kota' }}</option>
                        <option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option>
                      </select>
                    </div>
                  </div>
                </template>
                
                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep3Valid" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 4: Academic Info (Students only) -->
              <div v-if="step === 4 && role === 'student'" class="form-step animate-fade-in">
                <h4 class="step-title">Informasi Akademik</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Jenjang Pendidikan <span class="required">*</span></label>
                    <select v-model="educationLevel" class="form-input">
                      <option v-for="opt in educationLevelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Kelas / Tingkat <span class="required">*</span></label>
                    <select v-model="grade" class="form-input" :disabled="!educationLevel">
                      <option value="">Pilih kelas</option>
                      <option v-for="g in (gradeOptionsMap[educationLevel] || [])" :key="g" :value="g">{{ g }}</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Nama Sekolah / Universitas <span class="optional">(Opsional)</span></label>
                  <input v-model="schoolName" type="text" class="form-input" placeholder="Contoh: SMA Negeri 1 Jakarta">
                </div>

                <!-- Parent info if under 17 -->
                <template v-if="isUnder17">
                  <h4 class="step-title" style="margin-top: 20px;">Informasi Orang Tua / Wali</h4>
                  <p class="step-desc">Wajib diisi karena siswa di bawah 17 tahun</p>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Nama Orang Tua <span class="required">*</span></label>
                      <input v-model="parentName" type="text" class="form-input" placeholder="Nama lengkap orang tua">
                    </div>
                    <div class="form-group">
                      <label class="form-label">No. WhatsApp Orang Tua <span class="required">*</span></label>
                      <input v-model="parentPhone" type="tel" class="form-input" placeholder="08xxxxxxxxxx">
                    </div>
                  </div>
                </template>
                <template v-else>
                  <h4 class="step-title" style="margin-top: 20px;">Informasi Orang Tua / Wali <span class="optional">(Opsional)</span></h4>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Nama Orang Tua</label>
                      <input v-model="parentName" type="text" class="form-input" placeholder="Nama lengkap orang tua">
                    </div>
                    <div class="form-group">
                      <label class="form-label">No. WhatsApp Orang Tua</label>
                      <input v-model="parentPhone" type="tel" class="form-input" placeholder="08xxxxxxxxxx">
                    </div>
                  </div>
                </template>

                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep4ValidStudent || (isUnder17 && (!parentName || !parentPhone))" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 4: Invite Code (Teachers only) -->
              <div v-if="step === 4 && role === 'teacher'" class="form-step animate-fade-in">
                <h4 class="step-title">Kode Tempat Les</h4>
                <p class="step-desc">Masukkan kode undangan yang diberikan oleh pemilik tempat les</p>
                
                <div class="form-group">
                  <label class="form-label">Kode Undangan <span class="required">*</span></label>
                  <div class="invite-code-input">
                    <input 
                      v-model="inviteCode" 
                      type="text" 
                      class="form-input code-input" 
                      placeholder="Contoh: ABC123"
                      maxlength="6"
                      @input="inviteCode = inviteCode.toUpperCase()"
                    >
                    <button 
                      type="button" 
                      class="btn btn-outline" 
                      :disabled="!inviteCode || inviteCode.length < 6 || validatingCode"
                      @click="validateInviteCode"
                    >
                      {{ validatingCode ? 'Memeriksa...' : 'Validasi' }}
                    </button>
                  </div>
                  <span v-if="inviteCodeError" class="form-error">{{ inviteCodeError }}</span>
                </div>

                <div v-if="inviteCodeValid" class="success-card">
                  <span class="success-icon">✓</span>
                  <div class="success-info">
                    <strong>Kode Valid!</strong>
                    <p v-if="linkedLesPlace">Tempat Les: <strong>{{ linkedLesPlace.name }}</strong></p>
                    <p v-if="linkedOwner">Pemilik: <strong>{{ linkedOwner.users?.name || linkedOwner.business_name }}</strong></p>
                  </div>
                </div>

                <div class="info-box">
                  <p><strong>ℹ️ Tidak punya kode?</strong></p>
                  <p>Hubungi pemilik tempat les untuk mendapatkan kode undangan.</p>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep4ValidTeacher" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 4: Les Place Info (Owner only) -->
              <div v-if="step === 4 && role === 'owner'" class="form-step animate-fade-in">
                <h4 class="step-title">Informasi Tempat Les</h4>
                <p class="step-desc">Lengkapi informasi tentang tempat les yang akan Anda daftarkan</p>
                
                <div class="form-group">
                  <label class="form-label">Nama Tempat Les <span class="required">*</span></label>
                  <input v-model="lesPlaceName" type="text" class="form-input" placeholder="Contoh: Bimbel Cerdas Cemerlang">
                </div>
                
                <div class="form-group">
                  <label class="form-label">Jenis Les <span class="required">*</span></label>
                  <select v-model="lesPlaceType" class="form-input">
                    <option value="">Pilih jenis les</option>
                    <option value="offline">Offline (Tatap Muka)</option>
                    <option value="online">Online</option>
                    <option value="offline_online">Hybrid (Offline &amp; Online)</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Tipe Kepemilikan <span class="required">*</span></label>
                  <div class="owner-type-cards">
                    <div 
                      v-for="opt in ownerTypeOptions" 
                      :key="opt.value" 
                      class="owner-type-card" 
                      :class="{ selected: ownerType === opt.value }"
                      @click="ownerType = opt.value"
                    >
                      <div class="owner-type-radio">
                        <span class="radio-dot" :class="{ active: ownerType === opt.value }"></span>
                      </div>
                      <div class="owner-type-info">
                        <strong>{{ opt.label }}</strong>
                        <p>{{ opt.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Provinsi <span class="required">*</span></label>
                    <select :value="provinceId" @change="onProvinceChange" class="form-input" :disabled="loadingProvinces">
                      <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih provinsi' }}</option>
                      <option v-for="prov in provinces" :key="prov.id" :value="prov.id">{{ prov.name }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Kota / Kabupaten <span class="required">*</span></label>
                    <select :value="cityId" @change="onCityChange" class="form-input" :disabled="!provinceId || loadingCities">
                      <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih kota' }}</option>
                      <option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Alamat Lengkap <span class="optional">(Opsional)</span></label>
                  <textarea v-model="lesPlaceAddress" class="form-input" rows="2" placeholder="Alamat lengkap tempat les"></textarea>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Deskripsi <span class="optional">(Opsional)</span></label>
                  <textarea v-model="lesPlaceDescription" class="form-input" rows="3" placeholder="Deskripsi singkat tentang tempat les Anda"></textarea>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="button" class="btn btn-secondary btn-lg" :disabled="!isStep4ValidOwner" @click="nextStep">Lanjut →</button>
                </div>
              </div>

              <!-- Step 5 for student/teacher/owner: Confirmation -->
              <div v-if="step === 5" class="form-step animate-fade-in">
                <div class="summary-card">
                  <h4>Ringkasan Pendaftaran</h4>
                  <div class="summary-item"><span>Nama:</span><strong>{{ name }}</strong></div>
                  <div class="summary-item" v-if="nickname"><span>Panggilan:</span><strong>{{ nickname }}</strong></div>
                  <div class="summary-item"><span>Email:</span><strong>{{ email }}</strong></div>
                  <div class="summary-item"><span>Telepon:</span><strong>{{ phone }}</strong></div>
                  <div class="summary-item"><span>Jenis Akun:</span><strong>{{ getRoleLabel(role) }}</strong></div>
                  <template v-if="role === 'student'">
                    <div class="summary-item"><span>Jenjang:</span><strong>{{ educationLevel }} - {{ grade }}</strong></div>
                    <div class="summary-item" v-if="schoolName"><span>Sekolah:</span><strong>{{ schoolName }}</strong></div>
                    <div class="summary-item" v-if="cityName"><span>Lokasi:</span><strong>{{ cityName }}, {{ provinceName }}</strong></div>
                  </template>
                  <template v-if="role === 'teacher' && linkedLesPlace">
                    <div class="summary-item"><span>Tempat Les:</span><strong>{{ linkedLesPlace.name }}</strong></div>
                  </template>
                  <template v-if="role === 'owner'">
                    <div class="summary-item"><span>Nama Tempat Les:</span><strong>{{ lesPlaceName }}</strong></div>
                    <div class="summary-item"><span>Tipe Kepemilikan:</span><strong>{{ ownerType === 'pribadi' ? 'Pribadi (Mengajar Sendiri)' : 'Umum (Memiliki Guru)' }}</strong></div>
                    <div class="summary-item"><span>Lokasi:</span><strong>{{ cityName }}, {{ provinceName }}</strong></div>
                    <div class="summary-item" v-if="lesPlaceType"><span>Jenis Les:</span><strong>{{ lesPlaceType === 'offline' ? 'Offline' : lesPlaceType === 'online' ? 'Online' : 'Hybrid' }}</strong></div>
                  </template>
                </div>
                
                <label class="checkbox-label terms-checkbox">
                  <input type="checkbox" v-model="agreeTerms">
                  <span>Saya setuju dengan <a href="#" class="link">Syarat & Ketentuan</a> dan <a href="#" class="link">Kebijakan Privasi</a></span>
                </label>
                
                <div class="form-actions">
                  <button type="button" class="btn btn-outline" @click="prevStep">← Kembali</button>
                  <button type="submit" class="btn btn-secondary btn-lg" :disabled="!agreeTerms || loading">
                    <span v-if="loading" class="loading-spinner" style="width:20px;height:20px;"></span>
                    <span v-else>Daftar Sekarang</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div class="form-footer">
            <router-link to="/" class="back-link">← Kembali ke Beranda</router-link>
          </div>
        </div>
      </div>

      <div class="register-illustration">
        <div class="illustration-content">
          <div class="illustration-text">
            <h1>Mulai Perjalanan Belajar Anda</h1>
            <p>Bergabunglah dengan siswa dan guru di Mariles untuk pengalaman belajar yang lebih baik.</p>
          </div>
          <img src="/images/belajar_2.png" alt="Ilustrasi siswa belajar" class="illustration-image">
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page{min-height:100vh;display:flex;align-items:stretch}
.register-container{display:flex;width:100%;min-height:100vh}
.register-form-container{flex:1;display:flex;align-items:center;justify-content:center;padding:var(--spacing-2xl);background:var(--background);overflow-y:auto}
.register-form-wrapper{width:100%;max-width:520px}
.form-header{text-align:center;margin-bottom:var(--spacing-xl)}
.form-header h2{font-size:var(--font-size-2xl);font-weight:700;color:var(--text);margin:var(--spacing-lg) 0 var(--spacing-sm)}
.form-header p{color:var(--text-secondary)}
.link{color:var(--secondary);font-weight:600}
.link:hover{text-decoration:underline}
.logo-text{font-size:var(--font-size-xl);font-weight:700;background:var(--gradient-primary);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

.role-selection{display:flex;flex-direction:column;gap:var(--spacing-md)}
.role-card{display:flex;align-items:center;gap:var(--spacing-lg);padding:var(--spacing-xl);border:2px solid var(--border);border-radius:var(--radius-xl);cursor:pointer;transition:all var(--transition-base);background:white}
.role-card:hover{border-color:var(--secondary);transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.role-info{flex:1;display:flex;flex-direction:column}
.role-label{font-weight:700;color:#1a1a2e;font-size:var(--font-size-lg)}
.role-desc{font-size:var(--font-size-sm);color:#4a5568}
.role-arrow{font-size:var(--font-size-xl);color:#718096}
.role-card:hover .role-arrow{color:var(--secondary);transform:translateX(4px)}

.selected-role-badge{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-md);background:#e6f7fb;border-radius:var(--radius-lg);margin-bottom:var(--spacing-xl);justify-content:center;border:1px solid #88d0e4}
.selected-role-badge span{color:#2d3748;font-size:var(--font-size-sm)}
.selected-role-badge strong{color:#0a4568;font-size:var(--font-size-base)}
.selected-role-badge.compact{margin-bottom:var(--spacing-md);padding:var(--spacing-sm) var(--spacing-md)}
.change-role-btn{background:none;border:none;color:#0a4568;font-size:var(--font-size-sm);cursor:pointer;text-decoration:underline;margin-left:var(--spacing-sm)}
.method-selection{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.method-card{display:flex;align-items:center;gap:var(--spacing-md);padding:var(--spacing-xl);border:2px solid var(--border);border-radius:var(--radius-xl);cursor:pointer;transition:all var(--transition-base);background:white}
.method-card:hover{border-color:var(--secondary);box-shadow:var(--shadow-md)}
.method-info{flex:1}
.method-label{font-weight:600;color:#1a1a2e;display:block}
.method-desc{font-size:var(--font-size-sm);color:#4a5568}
.method-arrow{font-size:var(--font-size-lg);color:#718096}
.method-divider{text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);position:relative}
.method-divider::before,.method-divider::after{content:'';position:absolute;top:50%;width:calc(50% - 20px);height:1px;background:var(--border)}
.method-divider::before{left:0}.method-divider::after{right:0}
.method-google{padding:var(--spacing-lg);font-size:var(--font-size-base)}

.progress-steps{display:flex;justify-content:space-between;margin-bottom:var(--spacing-xl);position:relative}
.progress-steps::before{content:'';position:absolute;top:16px;left:10%;right:10%;height:2px;background:#d1d5db}
.progress-step{display:flex;flex-direction:column;align-items:center;gap:var(--spacing-xs);position:relative;z-index:1}
.step-circle{width:32px;height:32px;border-radius:50%;background:white;border:2px solid #9ca3af;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--font-size-sm);color:#4b5563;transition:all var(--transition-base)}
.progress-step.active .step-circle{border-color:#0a4568;color:#0a4568;background:#e6f7fb}
.progress-step.completed .step-circle{background:#0a4568;border-color:#0a4568;color:white}
.step-label{font-size:var(--font-size-xs);color:#6b7280;text-align:center;font-weight:500}
.progress-step.active .step-label,.progress-step.completed .step-label{color:#0a4568;font-weight:600}

.register-form{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.form-step{display:flex;flex-direction:column;gap:var(--spacing-md)}
.step-title{font-size:var(--font-size-base);font-weight:600;color:var(--text);margin-bottom:4px}
.step-desc{font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:12px}
.form-group{display:flex;flex-direction:column;gap:var(--spacing-xs)}
.form-label{font-weight:600;color:var(--text);font-size:var(--font-size-sm)}
.form-label .required{color:var(--error)}
.form-label .optional{color:var(--text-muted);font-weight:400}
.form-input{padding:var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-base);transition:all var(--transition-base)}
.form-input:focus{outline:none;border-color:var(--secondary);box-shadow:0 0 0 3px rgba(136,208,228,0.15)}
.form-input.error{border-color:var(--error)}
.form-input:disabled{background:var(--background);color:var(--text-muted);cursor:not-allowed}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-md)}
.form-error{font-size:var(--font-size-xs);color:var(--error)}
.form-actions{display:flex;gap:var(--spacing-md);margin-top:var(--spacing-sm)}
.form-actions .btn:last-child{flex:1}

.summary-card{background:var(--background-alt);padding:var(--spacing-lg);border-radius:var(--radius-xl);margin-bottom:var(--spacing-md)}
.summary-card h4{font-size:var(--font-size-base);margin-bottom:var(--spacing-md);color:var(--text)}
.summary-item{display:flex;justify-content:space-between;padding:var(--spacing-sm) 0;border-bottom:1px solid var(--border)}
.summary-item:last-child{border-bottom:none}
.summary-item span{color:var(--text-secondary);font-size:var(--font-size-sm)}
.summary-item strong{color:var(--text);font-size:var(--font-size-sm)}

.terms-checkbox{display:flex;align-items:flex-start;gap:var(--spacing-sm);font-size:var(--font-size-sm);color:var(--text-secondary);cursor:pointer}
.terms-checkbox input{width:18px;height:18px;margin-top:2px;accent-color:var(--secondary)}

.alert{padding:var(--spacing-md);border-radius:var(--radius-lg);font-size:var(--font-size-sm);margin-bottom:var(--spacing-md)}
.alert-error{background:var(--error-bg);color:var(--error)}
.alert-success{background:var(--success-bg);color:var(--success)}

.invite-code-input{display:flex;gap:var(--spacing-sm)}
.invite-code-input .code-input{flex:1;font-family:monospace;font-size:var(--font-size-lg);letter-spacing:4px;text-transform:uppercase;text-align:center}
.success-card{display:flex;align-items:center;gap:var(--spacing-md);padding:var(--spacing-md);background:#dcfce7;border:2px solid #86efac;border-radius:var(--radius-lg);margin-top:var(--spacing-md)}
.success-icon{width:40px;height:40px;background:#16a34a;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold}
.success-info strong{color:#16a34a;display:block;margin-bottom:4px}
.success-info p{font-size:var(--font-size-sm);color:#15803d;margin:0}
.info-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-lg);padding:var(--spacing-md);margin-top:var(--spacing-lg);font-size:var(--font-size-sm);color:#1e40af}
.info-box p{margin:0}
.info-box p:first-child{margin-bottom:4px}

.animate-fade-in{animation:fadeIn 0.3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

.social-btn{display:flex;align-items:center;justify-content:center;gap:var(--spacing-sm)}
.google-icon{flex-shrink:0}

.form-footer{margin-top:var(--spacing-xl);text-align:center}
.back-link{color:var(--text-secondary);font-size:var(--font-size-sm);transition:color var(--transition-fast)}
.back-link:hover{color:var(--secondary)}

.register-illustration{flex:1;background:linear-gradient(135deg,var(--secondary),#0A4568);display:flex;align-items:center;justify-content:center;padding:var(--spacing-2xl);position:relative;overflow:hidden}
.illustration-content{position:relative;z-index:1;width:100%;height:100%;max-width:520px;display:flex;flex-direction:column;align-items:center}
.illustration-text{color:white;margin-bottom:0;margin-top:2rem;position:relative;z-index:2;text-align:center}
.illustration-text h1{font-size:var(--font-size-3xl);font-weight:700;line-height:1.2;margin-bottom:var(--spacing-sm);color:white}
.illustration-text p{font-size:var(--font-size-base);opacity:0.9;line-height:1.6}
.illustration-image{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:100%;max-width:560px;height:auto;object-fit:contain;z-index:1;opacity:0.9}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}

@media(max-width:1024px){.register-illustration{display:none}}
@media(max-width:480px){.register-form-container{padding:var(--spacing-lg)}.form-row{grid-template-columns:1fr}.role-card,.method-card{padding:var(--spacing-lg)}}

/* Owner Type Selection Cards */
.owner-type-cards{display:flex;flex-direction:column;gap:var(--spacing-sm)}
.owner-type-card{display:flex;align-items:flex-start;gap:var(--spacing-md);padding:var(--spacing-md);border:2px solid var(--border);border-radius:var(--radius-lg);cursor:pointer;transition:all var(--transition-fast);background:white}
.owner-type-card:hover{border-color:var(--primary)}
.owner-type-card.selected{border-color:var(--secondary);background:#e6f7fb}
.owner-type-radio{padding-top:2px}
.radio-dot{display:block;width:18px;height:18px;border-radius:50%;border:2px solid #9ca3af;position:relative}
.radio-dot.active{border-color:var(--secondary)}
.radio-dot.active::after{content:'';position:absolute;top:3px;left:3px;width:8px;height:8px;border-radius:50%;background:var(--secondary)}
.owner-type-info strong{display:block;font-size:var(--font-size-sm);color:var(--text);margin-bottom:2px}
.owner-type-info p{font-size:var(--font-size-xs);color:var(--text-secondary);margin:0}

/* Owner Type Selection Phase (Large Cards) */
.owner-type-selection{margin-top:var(--spacing-lg)}
.selection-title{font-size:var(--font-size-lg);font-weight:600;color:var(--text);margin-bottom:var(--spacing-xs)}
.selection-desc{font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--spacing-lg)}
.owner-type-cards-large{display:flex;flex-direction:column;gap:var(--spacing-md)}
.owner-type-card-large{display:flex;align-items:center;gap:var(--spacing-lg);padding:var(--spacing-lg) var(--spacing-xl);background:white;border:2px solid var(--border);border-radius:var(--radius-xl);cursor:pointer;transition:all var(--transition-fast)}
.owner-type-card-large:hover{border-color:var(--secondary);background:#f0faff;transform:translateX(4px)}
.owner-type-card-large .card-icon{width:56px;height:56px;min-width:56px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e0f2fe,#bae6fd);border-radius:var(--radius-lg);color:#0284c7}
.owner-type-card-large .card-icon svg{width:28px;height:28px}
.owner-type-card-large .card-content{flex:1}
.owner-type-card-large .card-content strong{display:block;font-size:var(--font-size-lg);color:var(--text);margin-bottom:4px}
.owner-type-card-large .card-content p{font-size:var(--font-size-sm);color:var(--text-secondary);margin:0;line-height:1.5}
.owner-type-card-large .card-arrow{font-size:var(--font-size-xl);color:var(--text-muted);transition:transform var(--transition-fast)}
.owner-type-card-large:hover .card-arrow{transform:translateX(4px);color:var(--secondary)}

/* Badge separator */
.badge-separator{margin:0 var(--spacing-xs);color:var(--text-muted)}

.password-wrapper{position:relative}
.password-input{padding-right:40px}
.password-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary);opacity:0.6;transition:all 0.2s;padding:4px;display:flex;align-items:center;justify-content:center}
.password-toggle:hover{opacity:1;color:var(--primary)}
.toggle-icon{width:20px;height:20px}

/* Teacher Code Section */
.teacher-code-section{margin-top:var(--spacing-lg)}
.invite-code-form{margin-top:var(--spacing-lg)}
.invite-code-form .form-group{display:flex;gap:var(--spacing-sm);margin-bottom:var(--spacing-md)}
.invite-code-form .invite-code-input{flex:1;font-family:monospace;font-size:var(--font-size-lg);letter-spacing:4px;text-transform:uppercase;text-align:center}
.invite-code-form .validate-btn{white-space:nowrap}
.invite-error{color:var(--error);font-size:var(--font-size-sm);margin-bottom:var(--spacing-md)}
.invite-success{display:flex;align-items:flex-start;gap:var(--spacing-md);padding:var(--spacing-md);background:#dcfce7;border:2px solid #86efac;border-radius:var(--radius-lg);margin-bottom:var(--spacing-lg)}
.invite-success .success-icon{width:40px;height:40px;min-width:40px;background:#16a34a;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold}
.invite-success .success-info strong{color:#16a34a;display:block;margin-bottom:4px}
.invite-success .success-info p{font-size:var(--font-size-sm);color:#15803d;margin:0 0 4px 0}
.action-buttons{display:flex;gap:var(--spacing-md);justify-content:space-between;margin-top:var(--spacing-xl)}
.action-buttons .btn{flex:1}
</style>
