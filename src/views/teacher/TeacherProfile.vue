<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))
const authStore = useAuthStore()

// Form State
const profile = ref({
  name: '', avatar_url: '', email: '', phone: '', gender: '', birth_date: '', nik: '',
  specialization: [], experience_years: 0, qualification: '', bio: '',
  address: '', province_id: '', province_name: '', city_id: '', city_name: '',
  payment_type: 'bank', // 'bank' or 'ewallet'
  bank_name: '', bank_account: '', bank_holder: '',
  ewallet_type: '', ewallet_number: '',
  les_place_id: null, les_place_name: '', les_place_address: '', les_place_city: '', les_place_province: '', les_place_type: '',
  owner_id: null, owner_name: '', owner_phone: '', owner_email: '', owner_business_name: ''
})

const loading = ref(true)
const saving = ref(false)
const message = ref({ type: '', text: '' })
const activeTab = ref('identity')
const provinces = ref([])
const cities = ref([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)
const newSpec = ref('')
const showSaved = ref(false)

// Completion percentage
const completionPercent = computed(() => {
  const baseFields = [
    profile.value.name, profile.value.phone, profile.value.gender, profile.value.birth_date,
    profile.value.nik, profile.value.specialization?.length > 0, profile.value.qualification,
    profile.value.province_id, profile.value.city_id, profile.value.address
  ]
  
  // Check payment method based on selected type
  const hasPayment = profile.value.payment_type === 'bank' 
    ? (profile.value.bank_name && profile.value.bank_account && profile.value.bank_holder)
    : (profile.value.ewallet_type && profile.value.ewallet_number)
  
  const fields = [...baseFields, hasPayment]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
})

const genderOptions = [
  { value: '', label: 'Pilih jenis kelamin' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' }
]

const qualificationOptions = [
  { value: '', label: 'Pilih kualifikasi' },
  { value: 'SMA', label: 'SMA/SMK' },
  { value: 'D3', label: 'D3 (Diploma)' },
  { value: 'S1', label: 'S1 (Sarjana)' },
  { value: 'S2', label: 'S2 (Magister)' },
  { value: 'S3', label: 'S3 (Doktor)' },
  { value: 'Profesional', label: 'Sertifikasi Profesional' }
]

const bankOptions = [
  { value: '', label: 'Pilih bank' },
  { value: 'BCA', label: 'BCA' }, { value: 'BNI', label: 'BNI' }, { value: 'BRI', label: 'BRI' },
  { value: 'Mandiri', label: 'Mandiri' }, { value: 'CIMB', label: 'CIMB Niaga' },
  { value: 'BSI', label: 'Bank Syariah Indonesia' }, { value: 'Permata', label: 'Permata' },
  { value: 'Danamon', label: 'Danamon' }, { value: 'Lainnya', label: 'Lainnya' }
]

const ewalletOptions = [
  { value: '', label: 'Pilih e-wallet' },
  { value: 'OVO', label: 'OVO' },
  { value: 'GoPay', label: 'GoPay' },
  { value: 'DANA', label: 'DANA' },
  { value: 'ShopeePay', label: 'ShopeePay' },
  { value: 'LinkAja', label: 'LinkAja' }
]

const suggestedSpecs = [
  'Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris',
  'IPA', 'IPS', 'Ekonomi', 'Akuntansi', 'Komputer', 'Programming'
]

const tabs = [
  { id: 'identity', label: 'Identitas', icon: 'user' },
  { id: 'professional', label: 'Profesional', icon: 'graduation' },
  { id: 'address', label: 'Alamat', icon: 'location' },
  { id: 'bank', label: 'Rekening', icon: 'credit-card' },
  { id: 'workplace', label: 'Tempat Les', icon: 'home' }
]

watch(() => profile.value.province_id, async (newVal) => {
  if (newVal) await fetchCities(newVal)
  else { cities.value = []; profile.value.city_id = ''; profile.value.city_name = '' }
})

onMounted(async () => {
  await Promise.all([fetchProfile(), fetchProvinces()])
})

async function fetchProfile() {
  loading.value = true
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', authStore.user.id).single()
    const { data: teacherData } = await supabase.from('teachers')
      .select('*, les_places(id, name, address, city, province, type), owners(id, business_name, users(name, email, phone))')
      .eq('user_id', authStore.user.id).single()
    
    if (userData) {
      Object.assign(profile.value, {
        name: userData.name || '', email: userData.email || '', phone: userData.phone || '',
        gender: userData.gender || '', birth_date: userData.birth_date || '', avatar_url: userData.avatar_url || '', address: userData.address || ''
      })
    }
    if (teacherData) {
      Object.assign(profile.value, {
        specialization: teacherData.specialization || teacherData.specializations || [], experience_years: teacherData.experience_years || 0,
        qualification: teacherData.qualification || '', bio: teacherData.bio || '', nik: teacherData.nik || '',
        province_id: teacherData.province_id || '', province_name: teacherData.province_name || '',
        city_id: teacherData.city_id || '', city_name: teacherData.city_name || '',
        payment_type: teacherData.payment_type || 'bank',
        bank_name: teacherData.bank_name || '', bank_account: teacherData.bank_account || '', bank_holder: teacherData.bank_holder || '',
        ewallet_type: teacherData.ewallet_type || '', ewallet_number: teacherData.ewallet_number || '',
        les_place_id: teacherData.les_place_id || null,
        les_place_name: teacherData.les_places?.name || '', les_place_address: teacherData.les_places?.address || '',
        les_place_city: teacherData.les_places?.city || '', les_place_province: teacherData.les_places?.province || '', les_place_type: teacherData.les_places?.type || '',
        owner_id: teacherData.owner_id || null, owner_name: teacherData.owners?.users?.name || '',
        owner_phone: teacherData.owners?.users?.phone || '', owner_email: teacherData.owners?.users?.email || '', owner_business_name: teacherData.owners?.business_name || ''
      })
      if (teacherData.province_id) await fetchCities(teacherData.province_id)
    }
  } catch (err) { console.error('Error fetching profile:', err) }
  finally { loading.value = false }
}

async function fetchProvinces() {
  loadingProvinces.value = true
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    provinces.value = await res.json()
  } catch (err) {
    provinces.value = [{ id: '31', name: 'DKI JAKARTA' }, { id: '32', name: 'JAWA BARAT' }, { id: '33', name: 'JAWA TENGAH' }, { id: '35', name: 'JAWA TIMUR' }]
  } finally { loadingProvinces.value = false }
}

async function fetchCities(provId) {
  loadingCities.value = true
  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`)
    cities.value = await res.json()
  } catch (err) { console.error('Error fetching cities:', err) }
  finally { loadingCities.value = false }
}

function onProvinceChange(e) {
  const selected = provinces.value.find(p => p.id === e.target.value)
  profile.value.province_id = e.target.value
  profile.value.province_name = selected?.name || ''
  profile.value.city_id = ''; profile.value.city_name = ''
}

function onCityChange(e) {
  const selected = cities.value.find(c => c.id === e.target.value)
  profile.value.city_id = e.target.value
  profile.value.city_name = selected?.name || ''
}

function addSpecialization(spec) {
  const s = spec || newSpec.value.trim()
  if (s && !profile.value.specializations.includes(s)) profile.value.specializations.push(s)
  newSpec.value = ''
}

function removeSpecialization(index) { profile.value.specializations.splice(index, 1) }

async function handleSave() {
  saving.value = true
  message.value = { type: '', text: '' }
  try {
    // Update users table
    const { error: userError } = await supabase.from('users').update({
      name: profile.value.name, 
      phone: profile.value.phone, 
      gender: profile.value.gender,
      birth_date: profile.value.birth_date || null, 
      address: profile.value.address
    }).eq('id', authStore.user.id)
    
    if (userError) throw userError
    
    // Check if profile is complete (100%)
    const isComplete = completionPercent.value >= 100
    
    // Upsert teachers table with onConflict
    const { error: teacherError } = await supabase.from('teachers').upsert({
      user_id: authStore.user.id, 
      specialization: profile.value.specialization,
      experience_years: profile.value.experience_years, 
      qualification: profile.value.qualification,
      bio: profile.value.bio, 
      nik: profile.value.nik, 
      province_id: profile.value.province_id,
      province_name: profile.value.province_name, 
      city_id: profile.value.city_id, 
      city_name: profile.value.city_name,
      payment_type: profile.value.payment_type,
      bank_name: profile.value.bank_name, 
      bank_account: profile.value.bank_account, 
      bank_holder: profile.value.bank_holder,
      ewallet_type: profile.value.ewallet_type, 
      ewallet_number: profile.value.ewallet_number,
      is_profile_complete: isComplete
    }, { onConflict: 'user_id' })
    
    if (teacherError) throw teacherError
    
    await authStore.fetchUserProfile()
    showSaved.value = true
    setTimeout(() => showSaved.value = false, 3000)
  } catch (err) { 
    console.error('Error saving profile:', err)
    message.value = { type: 'error', text: 'Gagal menyimpan: ' + err.message } 
  }
  finally { saving.value = false }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar v-if="isOwner" />
    <TeacherSidebar v-else />

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profil Saya
          </h1>
          <p class="subtitle">Kelola informasi profil dan profesional Anda</p>
        </div>
        <button v-if="activeTab !== 'workplace'" class="btn-save" :disabled="saving" @click="handleSave">
          <svg v-if="!saving" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span v-if="saving" class="spinner"></span>
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </button>
      </header>

      <!-- Toast -->
      <div v-if="showSaved" class="toast success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Profil berhasil disimpan!
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner-lg"></div>
        <p>Memuat profil...</p>
      </div>

      <div v-else class="content">
        <!-- Profile Card -->
        <section class="profile-card">
          <div class="profile-avatar">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.name">
            <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          </div>
          <div class="profile-info">
            <h2>{{ profile.name || 'Nama Belum Diisi' }}</h2>
            <p class="email">{{ profile.email }}</p>
            <div class="profile-tags">
              <span class="tags-label">Program:</span>
              <span v-for="spec in profile.specialization.slice(0, 3)" :key="spec" class="spec-tag">{{ spec }}</span>
              <span v-if="profile.specialization.length > 3" class="more-tag">+{{ profile.specialization.length - 3 }}</span>
              <span v-if="!profile.specialization.length" class="text-muted text-xs">-</span>
            </div>
          </div>
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ profile.experience_years || 0 }}</span>
              <span class="stat-label">Tahun Pengalaman</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ profile.qualification || '-' }}</span>
              <span class="stat-label">Pendidikan</span>
            </div>
            <div class="stat-item">
              <div class="progress-circle" :style="{ '--percent': completionPercent }">
                <span>{{ completionPercent }}%</span>
              </div>
              <span class="stat-label">Kelengkapan</span>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <div class="tabs-container">
          <div class="tabs">
            <button v-for="tab in tabs" :key="tab.id" :class="['tab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
              <svg v-if="tab.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <svg v-else-if="tab.icon === 'graduation'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <svg v-else-if="tab.icon === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <svg v-else-if="tab.icon === 'credit-card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Identity Tab -->
          <section v-if="activeTab === 'identity'" class="form-section">
            <h3>Informasi Dasar</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Nama Lengkap <span class="req">*</span></label>
                <input v-model="profile.name" type="text" placeholder="Nama lengkap Anda">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input :value="profile.email" type="email" disabled>
              </div>
              <div class="form-group">
                <label>No. Telepon <span class="req">*</span></label>
                <input v-model="profile.phone" type="tel" placeholder="08xxxxxxxxxx">
              </div>
              <div class="form-group">
                <label>NIK</label>
                <input v-model="profile.nik" type="text" placeholder="16 digit NIK" maxlength="16">
              </div>
              <div class="form-group">
                <label>Jenis Kelamin</label>
                <select v-model="profile.gender">
                  <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tanggal Lahir</label>
                <input v-model="profile.birth_date" type="date">
              </div>
            </div>
          </section>

          <!-- Professional Tab -->
          <section v-else-if="activeTab === 'professional'" class="form-section">
            <h3>Informasi Profesional</h3>
            
            <div class="form-group">
              <label>Program yang Anda Ajar</label>
              <p class="description-text">Program mengajar ini ditentukan oleh pemilik tempat les Anda.</p>
              <div class="tags-input readonly">
                <span v-for="(spec, i) in profile.specialization" :key="i" class="tag bg-green">
                  {{ spec }}
                </span>
                <span v-if="!profile.specialization.length" class="text-muted">Belum ada program yang ditugaskan.</span>
              </div>
            </div>
            
            <div class="form-grid">
              <div class="form-group">
                <label>Pengalaman Mengajar</label>
                <div class="input-suffix">
                  <input v-model.number="profile.experience_years" type="number" min="0" max="50">
                  <span>tahun</span>
                </div>
              </div>
              <div class="form-group">
                <label>Pendidikan Terakhir</label>
                <select v-model="profile.qualification">
                  <option v-for="opt in qualificationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Bio / Tentang Saya</label>
              <textarea v-model="profile.bio" rows="4" placeholder="Ceritakan tentang diri Anda, pengalaman mengajar, metode pengajaran..."></textarea>
              <span class="char-count">{{ profile.bio?.length || 0 }} / 500</span>
            </div>
          </section>

          <!-- Address Tab -->
          <section v-else-if="activeTab === 'address'" class="form-section">
            <h3>Alamat dan Lokasi</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Provinsi</label>
                <select :value="profile.province_id" :disabled="loadingProvinces" @change="onProvinceChange">
                  <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih provinsi' }}</option>
                  <option v-for="prov in provinces" :key="prov.id" :value="prov.id">{{ prov.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Kota/Kabupaten</label>
                <select :value="profile.city_id" :disabled="!profile.province_id || loadingCities" @change="onCityChange">
                  <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih kota/kabupaten' }}</option>
                  <option v-for="city in cities" :key="city.id" :value="city.id">{{ city.name }}</option>
                </select>
              </div>
              <div class="form-group full">
                <label>Alamat Lengkap</label>
                <textarea v-model="profile.address" rows="3" placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan"></textarea>
              </div>
            </div>
          </section>

          <!-- Payment Method Tab -->
          <section v-else-if="activeTab === 'bank'" class="form-section">
            <h3>Metode Pembayaran</h3>
            <p class="section-desc">Pilih satu metode yang akan digunakan untuk pencairan gaji</p>
            
            <!-- Payment Type Toggle -->
            <div class="payment-toggle">
              <button 
                type="button" 
                :class="['toggle-btn', { active: profile.payment_type === 'bank' }]"
                @click="profile.payment_type = 'bank'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Transfer Bank
              </button>
              <button 
                type="button" 
                :class="['toggle-btn', { active: profile.payment_type === 'ewallet' }]"
                @click="profile.payment_type = 'ewallet'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                E-Wallet
              </button>
            </div>
            
            <!-- Bank Form -->
            <div v-if="profile.payment_type === 'bank'" class="payment-form">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nama Bank *</label>
                  <select v-model="profile.bank_name">
                    <option v-for="opt in bankOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nomor Rekening *</label>
                  <input v-model="profile.bank_account" type="text" placeholder="Contoh: 1234567890">
                </div>
                <div class="form-group full">
                  <label>Nama Pemilik Rekening *</label>
                  <input v-model="profile.bank_holder" type="text" placeholder="Nama sesuai buku rekening">
                </div>
              </div>
              
              <div v-if="profile.bank_name && profile.bank_account" class="bank-preview">
                <div class="bank-card">
                  <span class="bank-name">{{ profile.bank_name }}</span>
                  <span class="bank-number">{{ profile.bank_account }}</span>
                  <span class="bank-holder">{{ profile.bank_holder }}</span>
                </div>
              </div>
            </div>
            
            <!-- E-Wallet Form -->
            <div v-else class="payment-form">
              <div class="form-grid">
                <div class="form-group">
                  <label>Jenis E-Wallet *</label>
                  <select v-model="profile.ewallet_type">
                    <option v-for="opt in ewalletOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nomor E-Wallet *</label>
                  <input v-model="profile.ewallet_number" type="text" placeholder="Contoh: 08123456789">
                </div>
              </div>
              
              <div v-if="profile.ewallet_type && profile.ewallet_number" class="ewallet-preview">
                <div class="ewallet-card">
                  <span class="ewallet-type">{{ profile.ewallet_type }}</span>
                  <span class="ewallet-number">{{ profile.ewallet_number }}</span>
                </div>
              </div>
            </div>
            
            <div class="payment-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p>Metode pembayaran yang dipilih akan digunakan untuk pencairan gaji dan honorarium Anda.</p>
            </div>
          </section>

          <!-- Workplace Tab -->
          <section v-else-if="activeTab === 'workplace'" class="form-section">
            <h3>Tempat Les Terhubung</h3>
            
            <div v-if="profile.les_place_name" class="workplace-connected">
              <div class="workplace-card">
                <div class="wp-header">
                  <div class="wp-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                  </div>
                  <div class="wp-title">
                    <h4>{{ profile.les_place_name }}</h4>
                    <span class="wp-type">{{ profile.les_place_type === 'online' ? 'Online' : profile.les_place_type === 'offline' ? 'Offline' : 'Hybrid' }}</span>
                  </div>
                  <span class="status-badge">Aktif</span>
                </div>
                <div class="wp-details">
                  <div class="detail-row" v-if="profile.les_place_address">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{{ profile.les_place_address }}, {{ profile.les_place_city }}, {{ profile.les_place_province }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="profile.owner_name" class="owner-section">
                <h4>Pemilik Tempat Les</h4>
                <div class="owner-card">
                  <div class="owner-avatar">{{ profile.owner_name?.charAt(0) }}</div>
                  <div class="owner-info">
                    <span class="owner-name">{{ profile.owner_name }}</span>
                    <span class="owner-business" v-if="profile.owner_business_name">{{ profile.owner_business_name }}</span>
                  </div>
                  <div class="owner-contact">
                    <a v-if="profile.owner_phone" :href="'tel:' + profile.owner_phone" class="contact-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                      </svg>
                    </a>
                    <a v-if="profile.owner_email" :href="'mailto:' + profile.owner_email" class="contact-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="workplace-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <h4>Belum Terhubung</h4>
              <p>Anda belum terhubung dengan tempat les manapun.</p>
              <span class="hint">Minta kode undangan dari pemilik tempat les untuk bergabung</span>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 32px; max-width: 1000px; margin: 0 auto; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: #1e293b; }
.header-left h1 svg { width: 28px; height: 28px; color: #0d5782; }
.subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

.btn-save {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  background: #0d5782; color: white; border: none; border-radius: 10px;
  font-weight: 600; font-size: 14px; cursor: pointer;
}
.btn-save:hover { background: #0a4568; }
.btn-save:disabled { background: #94a3b8; cursor: not-allowed; }
.btn-save svg { width: 18px; height: 18px; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }

/* Toast */
.toast { position: fixed; top: 24px; right: 24px; display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: #dcfce7; color: #16a34a; border-radius: 10px; font-weight: 600; z-index: 1000; animation: slideIn 0.3s ease; }
.toast svg { width: 20px; height: 20px; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* Loading */
.loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; gap: 16px; }
.spinner-lg { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Profile Card */
.profile-card {
  display: flex; align-items: center; gap: 24px; padding: 24px;
  background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 24px;
}
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #0d5782, #1e40af); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; overflow: hidden; flex-shrink: 0; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-info { flex: 1; }
.profile-info h2 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 2px; }
.profile-info .email { font-size: 14px; color: #64748b; margin-bottom: 8px; }
.profile-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.tags-label { font-size: 12px; color: #64748b; margin-right: 4px; font-weight: 500; }
.spec-tag { padding: 4px 10px; background: #dbeafe; color: #2563eb; border-radius: 20px; font-size: 12px; font-weight: 600; }
.more-tag { padding: 4px 10px; background: #f1f5f9; color: #64748b; border-radius: 20px; font-size: 12px; }

.profile-stats { display: flex; gap: 24px; }
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 20px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 12px; color: #64748b; }

.progress-circle { width: 48px; height: 48px; border-radius: 50%; background: conic-gradient(#0d5782 calc(var(--percent) * 1%), #e2e8f0 0); display: flex; align-items: center; justify-content: center; position: relative; margin: 0 auto 4px; }
.progress-circle::before { content: ''; position: absolute; width: 38px; height: 38px; background: white; border-radius: 50%; }
.progress-circle span { position: relative; font-size: 11px; font-weight: 700; color: #0d5782; }

/* Tabs */
.tabs-container { background: white; border-radius: 12px; padding: 4px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow-x: auto; }
.tabs { display: flex; gap: 4px; }
.tab { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: none; background: transparent; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 10px; white-space: nowrap; }
.tab:hover { color: #0d5782; background: #f0f9ff; }
.tab.active { background: #0d5782; color: white; }
.tab svg { width: 18px; height: 18px; }

/* Tab Content */
.tab-content { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.form-section h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }
.section-desc { font-size: 14px; color: #64748b; margin-top: -12px; margin-bottom: 20px; }

/* Form */
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-group.full { grid-column: span 2; }
.form-group label { font-size: 14px; font-weight: 600; color: #475569; }
.req { color: #dc2626; }
.form-group input, .form-group select, .form-group textarea { padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0d5782; }
.form-group input:disabled { background: #f8fafc; color: #94a3b8; }
.char-count { font-size: 12px; color: #94a3b8; text-align: right; }

.input-suffix { display: flex; align-items: center; gap: 8px; }
.input-suffix input { flex: 1; }
.input-suffix span { font-size: 14px; color: #64748b; }

/* Tags */
.tags-input { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; }
.tags-input input { flex: 1; min-width: 150px; border: none; outline: none; font-size: 14px; }
.tag { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #dbeafe; color: #2563eb; border-radius: 20px; font-size: 13px; font-weight: 600; }
.tag button { background: none; border: none; color: #2563eb; cursor: pointer; font-size: 14px; }
.suggested-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }
.suggested-tags span { font-size: 12px; color: #94a3b8; }
.suggested-tags button { padding: 4px 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 20px; font-size: 12px; color: #64748b; cursor: pointer; }
.suggested-tags button:hover { background: #e2e8f0; border-style: solid; }

/* Bank Preview */
.bank-preview { margin-top: 24px; }
.bank-card { padding: 20px; background: linear-gradient(135deg, #1e40af, #0d5782); border-radius: 14px; color: white; }
.bank-name { display: block; font-size: 14px; font-weight: 600; opacity: 0.8; margin-bottom: 16px; }
.bank-number { display: block; font-size: 22px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; }
.bank-holder { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }

/* Section Divider */
.section-divider { height: 1px; background: #e2e8f0; margin: 32px 0; }

/* E-Wallet Preview */
.ewallet-preview { margin-top: 16px; }
.ewallet-card { padding: 16px 20px; background: linear-gradient(135deg, #16a34a, #15803d); border-radius: 14px; color: white; display: flex; justify-content: space-between; align-items: center; }
.ewallet-type { font-size: 16px; font-weight: 700; }
.ewallet-number { font-size: 18px; font-weight: 600; letter-spacing: 1px; }

/* Payment Toggle */
.payment-toggle { display: flex; gap: 12px; margin-bottom: 24px; }
.toggle-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; }
.toggle-btn svg { width: 20px; height: 20px; }
.toggle-btn:hover { border-color: #0d5782; color: #0d5782; }
.toggle-btn.active { background: #e0f2fe; border-color: #0d5782; color: #0d5782; }
.payment-form { margin-top: 16px; }
.payment-note { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: #f0f9ff; border-radius: 10px; margin-top: 24px; }
.payment-note svg { width: 20px; height: 20px; color: #0d5782; flex-shrink: 0; margin-top: 2px; }
.payment-note p { font-size: 13px; color: #475569; line-height: 1.5; }

/* Workplace */
.workplace-connected { display: flex; flex-direction: column; gap: 20px; }
.workplace-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 20px; }
.wp-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.wp-icon { width: 48px; height: 48px; background: #0d5782; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.wp-icon svg { width: 24px; height: 24px; }
.wp-title { flex: 1; }
.wp-title h4 { font-size: 18px; font-weight: 700; color: #0d5782; margin-bottom: 2px; }
.wp-type { font-size: 13px; color: #64748b; }
.status-badge { padding: 4px 12px; background: #dcfce7; color: #16a34a; border-radius: 20px; font-size: 12px; font-weight: 600; }
.wp-details { display: flex; flex-direction: column; gap: 8px; }
.detail-row { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #475569; }
.detail-row svg { width: 18px; height: 18px; color: #64748b; flex-shrink: 0; margin-top: 2px; }

.owner-section h4 { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.owner-card { display: flex; align-items: center; gap: 14px; padding: 16px; background: #f8fafc; border-radius: 12px; }
.owner-avatar { width: 44px; height: 44px; background: #9333ea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.owner-info { flex: 1; }
.owner-name { display: block; font-size: 15px; font-weight: 600; color: #1e293b; }
.owner-business { font-size: 13px; color: #64748b; }
.owner-contact { display: flex; gap: 8px; }
.contact-btn { width: 36px; height: 36px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; }
.contact-btn:hover { background: #0d5782; color: white; border-color: #0d5782; }
.contact-btn svg { width: 16px; height: 16px; }

.workplace-empty { text-align: center; padding: 48px; background: #f8fafc; border-radius: 14px; border: 2px dashed #e2e8f0; }
.workplace-empty svg { width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; }
.workplace-empty h4 { font-size: 18px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.workplace-empty p { font-size: 14px; color: #64748b; margin-bottom: 8px; }
.workplace-empty .hint { font-size: 13px; color: #94a3b8; }

/* Responsive */
@media (max-width: 768px) {
  .main { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .profile-card { flex-direction: column; text-align: center; }
  .profile-stats { justify-content: center; }
  .form-grid { grid-template-columns: 1fr; }
  .form-group.full { grid-column: span 1; }
  .tabs { overflow-x: auto; }
  .tab span { display: none; }
}

.description-text { font-size: 13px; color: #64748b; margin-top: -4px; margin-bottom: 8px; }
.tags-input.readonly { background: #f8fafc; border-color: #cbd5e1; }
.tag.bg-green { background: #dcfce7; color: #16a34a; }
.text-muted { font-size: 13px; color: #94a3b8; font-style: italic; }
</style>
