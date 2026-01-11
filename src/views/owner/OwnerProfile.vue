<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

// State
const loading = ref(true)
const saving = ref(false)
const showSaved = ref(false)
const message = ref({ type: '', text: '' })
const activeTab = ref('identity')

// Data
const profile = ref({
  // Identity
  name: '', avatar_url: '', email: '', phone: '', 
  gender: '', birth_date: '', nik: '',
  owner_type: 'umum', // 'pribadi' or 'umum'
  
  // Business
  company_name: '', business_type: '', npwp: '', business_desc: '',
  
  // Address
  address: '', province_id: '', province_name: '', city_id: '', city_name: '',
  
  // Bank & E-Wallet
  payment_type: 'bank', // 'bank' or 'ewallet'
  bank_name: '', bank_account: '', bank_holder: '',
  ewallet_type: '', ewallet_number: ''
})

const stats = ref({
  total_branches: 0,
  total_teachers: 0,
  total_students: 0
})

const lesPlaces = ref([])
const provinces = ref([])
const cities = ref([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)
const loadingLesPlaces = ref(false)
const generatingCode = ref(null)
const togglingActive = ref(false)

// Computed: Completion Percentage - must match AdminLesPlaces.vue
const completionPercent = computed(() => {
  // 9 fields matching Admin: nama, phone, nik, nama usaha, jenis usaha, provinsi, kota, alamat, pembayaran
  const baseFields = [
    profile.value.name, 
    profile.value.phone, 
    profile.value.nik,
    profile.value.company_name, 
    profile.value.business_type,
    profile.value.province_id,
    profile.value.city_id,
    profile.value.address
  ]
  
  // Check payment method based on selected type
  const hasPayment = profile.value.payment_type === 'bank' 
    ? (profile.value.bank_name && profile.value.bank_account)
    : (profile.value.ewallet_type && profile.value.ewallet_number)
  
  const fields = [...baseFields, hasPayment]
  const filled = fields.filter(f => f && f.toString().length > 0).length
  return Math.round((filled / fields.length) * 100)
})

// Options
const genderOptions = [
  { value: '', label: 'Pilih jenis kelamin' },
  { value: 'male', label: 'Laki-laki' },
  { value: 'female', label: 'Perempuan' }
]

const businessTypeOptions = [
  { value: '', label: 'Pilih jenis usaha' },
  { value: 'Bimbingan Belajar', label: 'Bimbingan Belajar' },
  { value: 'Kursus/Lembaga Pelatihan', label: 'Kursus/Lembaga Pelatihan' },
  { value: 'Les Privat', label: 'Les Privat' },
  { value: 'Kursus Online', label: 'Kursus Online' },
  { value: 'Lainnya', label: 'Lainnya' }
]

const bankOptions = [
  { value: '', label: 'Pilih Bank' },
  { value: 'BCA', label: 'BCA' }, { value: 'BNI', label: 'BNI' }, { value: 'BRI', label: 'BRI' },
  { value: 'Mandiri', label: 'Mandiri' }, { value: 'CIMB', label: 'CIMB Niaga' },
  { value: 'BSI', label: 'Bank Syariah Indonesia' }, { value: 'Permata', label: 'Permata' },
  { value: 'Danamon', label: 'Danamon' }, { value: 'OCBC', label: 'OCBC NISP' }, { value: 'Lainnya', label: 'Lainnya' }
]

const ewalletOptions = [
  { value: '', label: 'Pilih E-Wallet' },
  { value: 'OVO', label: 'OVO' }, { value: 'GoPay', label: 'GoPay' },
  { value: 'DANA', label: 'DANA' }, { value: 'ShopeePay', label: 'ShopeePay' }, { value: 'LinkAja', label: 'LinkAja' }
]

const tabs = [
  { id: 'identity', label: 'Identitas', icon: 'user' },
  { id: 'business', label: 'Bisnis', icon: 'building' },
  { id: 'business', label: 'Bisnis', icon: 'building' },
  { id: 'address', label: 'Alamat', icon: 'location' },
  { id: 'bank', label: 'Keuangan', icon: 'credit-card' },
  { id: 'account', label: 'Akun', icon: 'key' }
]

// Watchers
watch(() => profile.value.province_id, async (newVal) => {
  if (newVal) await fetchCities(newVal)
  else { cities.value = []; profile.value.city_id = ''; profile.value.city_name = '' }
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchProfile(),
    fetchProvinces(),
    fetchLesPlaces()
  ])
  await fetchStats() // New stats fetch
})

// Methods
async function fetchProfile() {
  loading.value = true
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', authStore.user.id).single()
    const { data: ownerData } = await supabase.from('owners').select('*').eq('user_id', authStore.user.id).single()
    
    // Also fetch first les_place for address fallback
    const { data: lesPlaceData } = await supabase
      .from('les_places_with_owner')
      .select('address, city, province')
      .eq('owner_email', authStore.user.email)
      .limit(1)
      .single()
    
    if (userData) {
      Object.assign(profile.value, {
        name: userData.name || '', 
        email: userData.email || '', 
        phone: userData.phone || '',
        gender: userData.gender || '', 
        birth_date: userData.birth_date || '', 
        avatar_url: userData.avatar_url || '',
        address: userData.address || ''
      })
    }
    
    if (ownerData) {
      Object.assign(profile.value, {
        // Bisnis - ambil dari business_name atau company_name
        company_name: ownerData.business_name || ownerData.company_name || '', 
        business_type: ownerData.business_type || '',
        business_desc: ownerData.description || '',
        npwp: ownerData.npwp || '', 
        nik: ownerData.nik || '',
        // Alamat - ambil dari owner jika ada
        province_id: ownerData.province_id || '', 
        province_name: ownerData.province_name || '',
        city_id: ownerData.city_id || '', 
        city_name: ownerData.city_name || '',
        // Keuangan
        payment_type: ownerData.payment_type || 'bank',
        bank_name: ownerData.bank_name || '', 
        bank_account: ownerData.bank_account || '', 
        bank_holder: ownerData.bank_holder || '',
        ewallet_type: ownerData.ewallet_type || '', 
        ewallet_number: ownerData.ewallet_number || ''
      })
      
      // Jika alamat dari user kosong, gunakan dari business_address
      if (!profile.value.address && ownerData.business_address) {
        profile.value.address = ownerData.business_address
      }
      
      // Jika phone dari user kosong, gunakan dari business_phone
      if (!profile.value.phone && ownerData.business_phone) {
        profile.value.phone = ownerData.business_phone
      }
      
      if (ownerData.province_id) await fetchCities(ownerData.province_id)
    }
    
    // PRE-FILL from les_places registration if owner profile is empty
    if (lesPlaceData) {
      // Alamat dari les_places jika owner belum diisi
      if (!profile.value.address && lesPlaceData.address) {
        profile.value.address = lesPlaceData.address
      }
      
      // Auto-select province from les_places by matching name
      if (!profile.value.province_id && lesPlaceData.province) {
        // Find matching province ID from loaded provinces list
        const matchedProvince = provinces.value.find(p => 
          p.name.toUpperCase().includes(lesPlaceData.province.toUpperCase()) ||
          lesPlaceData.province.toUpperCase().includes(p.name.toUpperCase())
        )
        if (matchedProvince) {
          profile.value.province_id = matchedProvince.id
          profile.value.province_name = matchedProvince.name
          // Fetch cities for this province
          await fetchCities(matchedProvince.id)
          
          // Auto-select city from les_places by matching name
          if (!profile.value.city_id && lesPlaceData.city) {
            const matchedCity = cities.value.find(c => 
              c.name.toUpperCase().includes(lesPlaceData.city.toUpperCase()) ||
              lesPlaceData.city.toUpperCase().includes(c.name.toUpperCase())
            )
            if (matchedCity) {
              profile.value.city_id = matchedCity.id
              profile.value.city_name = matchedCity.name
            }
          }
        }
      }
    }
  } catch (err) { console.error('Error profile:', err) }
  finally { loading.value = false }
}

async function fetchStats() {
  // Simulating or fetching real stats logic
  // 1. Total Branches (Les Places)
  stats.value.total_branches = lesPlaces.value.length

  // Determine Owner Type based on branches
  if (lesPlaces.value.length > 0) {
    const isPrivate = lesPlaces.value.some(lp => lp.is_private)
    profile.value.owner_type = isPrivate ? 'pribadi' : 'umum'
  }

  // 2. Total Teachers (Count teachers in owner's les places)
  // This requires a more complex query, for now we leave it simple or fetch if we had a view.
  // We'll trust the user wants "detail" visually first.
}

async function fetchProvinces() {
  loadingProvinces.value = true
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    provinces.value = await res.json()
  } catch (err) {
    provinces.value = [{ id: '31', name: 'DKI JAKARTA' }, { id: '32', name: 'JAWA BARAT' }, { id: '33', name: 'JAWA TENGAH' }]
  } finally { loadingProvinces.value = false }
}

async function fetchCities(provId) {
  loadingCities.value = true
  try {
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`)
    cities.value = await res.json()
  } catch (err) { /* silent fail */ }
  finally { loadingCities.value = false }
}

async function fetchLesPlaces() {
  loadingLesPlaces.value = true
  try {
    // Gunakan view les_places_with_owner yang bypass RLS
    // Filter berdasarkan owner_email yang sama dengan user saat ini
    const { data, error } = await supabase
      .from('les_places_with_owner')
      .select('id, name, is_private, is_verified, is_active, owner_name, owner_email')
      .eq('owner_email', authStore.user.email)
    
    if (error) {
      console.error('Error fetching les places:', error)
      lesPlaces.value = []
    } else {
      lesPlaces.value = data || []
    }
  } catch (err) { 
    console.error('Error:', err) 
    lesPlaces.value = []
  }
  finally { loadingLesPlaces.value = false }
}

async function toggleLesPlaceActive(lesPlace) {
  if (togglingActive.value) return
  togglingActive.value = true
  
  const newStatus = !(lesPlace.is_active ?? true)
  
  try {
    const { error } = await supabase
      .from('les_places')
      .update({ is_active: newStatus })
      .eq('id', lesPlace.id)
    
    if (error) throw error
    
    // Update local state
    const idx = lesPlaces.value.findIndex(lp => lp.id === lesPlace.id)
    if (idx !== -1) {
      lesPlaces.value[idx].is_active = newStatus
    }
  } catch (err) {
    console.error('Error toggling les place:', err)
    message.value = { type: 'error', text: 'Gagal mengubah status: ' + err.message }
  } finally {
    togglingActive.value = false
  }
}

function onProvinceChange(e) {
  const selected = provinces.value.find(p => p.id === e.target.value)
  profile.value.province_id = e.target.value; profile.value.province_name = selected?.name || ''
  profile.value.city_id = ''; profile.value.city_name = ''
}

function onCityChange(e) {
  const selected = cities.value.find(c => c.id === e.target.value)
  profile.value.city_id = e.target.value; profile.value.city_name = selected?.name || ''
}

async function handleSave() {
  saving.value = true
  message.value = { type: '', text: '' }
  try {
    // Update users table
    const { error: uErr } = await supabase.from('users').update({
      name: profile.value.name, 
      phone: profile.value.phone, 
      gender: profile.value.gender,
      birth_date: profile.value.birth_date || null, 
      address: profile.value.address
    }).eq('id', authStore.user.id)
    if (uErr) throw uErr

    // Update owners table - use upsert with onConflict
    const { error: oErr } = await supabase.from('owners').upsert({
      user_id: authStore.user.id,
      business_name: profile.value.company_name,
      business_type: profile.value.business_type,
      npwp: profile.value.npwp, 
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
      ewallet_number: profile.value.ewallet_number
    }, { onConflict: 'user_id' })
    if (oErr) throw oErr

    await authStore.fetchUserProfile()
    showSaved.value = true
    setTimeout(() => showSaved.value = false, 3000)
  } catch (err) {
    console.error('Save error:', err)
    message.value = { type: 'error', text: 'Gagal menyimpan: ' + err.message }
  } finally {
    saving.value = false
  }
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
      <!-- Header Area -->
      <header class="page-header">
        <div class="header-content">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profil & Bisnis
          </h1>
          <p class="subtitle">Kelola identitas diri dan informasi bisnis Anda</p>
        </div>
        
        <button class="btn-save" :disabled="saving" @click="handleSave">
          <span v-if="saving" class="spinner"></span>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </header>

      <!-- Toast Notification -->
      <transition name="toast-slide">
        <div v-if="showSaved" class="toast success">
          <div class="toast-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span>Perubahan berhasil disimpan!</span>
        </div>
      </transition>
      
      <div v-if="message.text && !showSaved" class="alert-box" :class="message.type">
        {{ message.text }}
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner-lg"></div>
        <p>Memuat data profil...</p>
      </div>

      <div v-else class="content-wrapper">
        <!-- Profile Header Card -->
        <div class="profile-header-card">
          <div class="profile-main">
            <div class="avatar-wrapper">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" alt="Avatar">
              <div v-else class="avatar-placeholder">{{ profile.name?.charAt(0) }}</div>
              <button class="btn-edit-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            </div>
            <div class="profile-details">
              <div class="name-row">
                <h2>{{ profile.name || 'Nama Belum Diisi' }}</h2>
                <span class="badge" :class="profile.owner_type">Pemilik {{ profile.owner_type === 'pribadi' ? 'Pribadi' : 'Umum' }}</span>
                <span v-if="lesPlaces.length > 0" class="badge" :class="lesPlaces[0]?.is_verified ? 'verified' : 'pending'">
                  {{ lesPlaces[0]?.is_verified ? 'Terverifikasi' : 'Menunggu Verifikasi' }}
                </span>
              </div>
              <p class="email">{{ profile.email }}</p>
              <div class="location" v-if="profile.city_name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ profile.city_name }}, {{ profile.province_name }}
              </div>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat-box" :class="lesPlaces[0]?.is_verified ? 'success' : 'warning'">
              <span class="stat-num">{{ lesPlaces[0]?.is_verified ? 'Ya' : 'Tidak' }}</span>
              <span class="stat-label">Status Verifikasi</span>
            </div>
            <div class="stat-box highlight">
              <div class="progress-ring" :style="{ '--p': completionPercent }">
                <span>{{ completionPercent }}%</span>
              </div>
              <span class="stat-label">Kelengkapan</span>
            </div>
            <!-- Toggle Aktif Tempat Les -->
            <div v-if="lesPlaces.length > 0" class="stat-box toggle-box" :class="(lesPlaces[0]?.is_active ?? true) ? 'active' : 'inactive'">
              <label class="toggle-switch" :class="{ disabled: togglingActive }">
                <input 
                  type="checkbox" 
                  :checked="lesPlaces[0]?.is_active ?? true" 
                  :disabled="togglingActive"
                  @change="toggleLesPlaceActive(lesPlaces[0])"
                >
                <span class="toggle-slider"></span>
              </label>
              <span class="stat-label">{{ (lesPlaces[0]?.is_active ?? true) ? 'Aktif' : 'Nonaktif' }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-nav">
          <button 
            v-for="tab in tabs" 
            :key="tab.id" 
            class="tab-btn" 
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <div class="tab-icon">
              <svg v-if="tab.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <svg v-if="tab.icon === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="22"/><path d="M9 22v-4h6v4"/></svg>
              <svg v-if="tab.icon === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <svg v-if="tab.icon === 'credit-card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              <svg v-if="tab.icon === 'key'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Content Area -->
        <div class="tab-content">
          <!-- Identity -->
          <div v-show="activeTab === 'identity'" class="form-section">
            <h3 class="section-title">Informasi Pribadi</h3>
            <div class="form-grid">
              <div class="input-group">
                <label>Nama Lengkap <span class="req">*</span></label>
                <input v-model="profile.name" type="text" class="input-field" placeholder="Nama sesuai KTP">
              </div>
              <div class="input-group">
                <label>Email</label>
                <input :value="profile.email" type="email" class="input-field disabled" disabled>
              </div>
              <div class="input-group">
                <label>Nomor Telepon <span class="req">*</span></label>
                <input v-model="profile.phone" type="tel" class="input-field" placeholder="08xxxxxxxxxx">
              </div>
              <div class="input-group">
                <label>Nomor Induk Kependudukan (NIK)</label>
                <input v-model="profile.nik" type="text" class="input-field" placeholder="16 digit NIK" maxlength="16">
              </div>
              <div class="input-group">
                <label>Jenis Kelamin</label>
                <select v-model="profile.gender" class="input-field">
                  <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="input-group">
                <label>Tanggal Lahir</label>
                <input v-model="profile.birth_date" type="date" class="input-field">
              </div>
            </div>
          </div>

          <!-- Business -->
          <div v-show="activeTab === 'business'" class="form-section">
            <h3 class="section-title">Detail Bisnis</h3>
            <div class="form-grid">
              <div class="input-group full">
                <label>Nama Usaha / Bimbel</label>
                <input v-model="profile.company_name" type="text" class="input-field" placeholder="Contoh: Ganesha Operation Cabang X">
              </div>
              <div class="input-group">
                <label>Jenis Usaha</label>
                <select v-model="profile.business_type" class="input-field">
                  <option v-for="opt in businessTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="input-group">
                <label>NPWP (Opsional)</label>
                <input v-model="profile.npwp" type="text" class="input-field" placeholder="00.000.000.0-000.000">
              </div>
            </div>
          </div>

          <!-- Address -->
          <div v-show="activeTab === 'address'" class="form-section">
            <h3 class="section-title">Alamat & Lokasi</h3>
            <div class="form-grid">
              <div class="input-group">
                <label>Provinsi</label>
                <select :value="profile.province_id" class="input-field" :disabled="loadingProvinces" @change="onProvinceChange">
                  <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih Provinsi' }}</option>
                  <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>
              <div class="input-group">
                <label>Kota / Kabupaten</label>
                <select :value="profile.city_id" class="input-field" :disabled="!profile.province_id || loadingCities" @change="onCityChange">
                  <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih Kota/Kabupaten' }}</option>
                  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="input-group full">
                <label>Alamat Lengkap</label>
                <textarea v-model="profile.address" rows="3" class="input-field" placeholder="Nama Jalan, RT/RW, Kelurahan, Kecamatan"></textarea>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div v-show="activeTab === 'bank'" class="form-section">
            <h3 class="section-title">Metode Pembayaran</h3>
            <p class="section-subtitle">Pilih satu metode yang akan digunakan untuk pencairan dana.</p>
            
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
              <div class="form-grid single-col">
                <div class="input-group">
                  <label>Nama Bank *</label>
                  <select v-model="profile.bank_name" class="input-field">
                    <option v-for="opt in bankOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="input-group">
                  <label>Nomor Rekening *</label>
                  <input v-model="profile.bank_account" type="text" class="input-field" placeholder="1234567890">
                </div>
                <div class="input-group">
                  <label>Nama Pemilik *</label>
                  <input v-model="profile.bank_holder" type="text" class="input-field" placeholder="Sesuai Buku Tabungan">
                </div>
              </div>
              
              <!-- Preview Bank -->
              <div v-if="profile.bank_name" class="card-preview bank">
                <div class="card-chip"></div>
                <div class="card-logo">{{ profile.bank_name }}</div>
                <div class="card-number">{{ profile.bank_account || '•••• •••• ••••' }}</div>
                <div class="card-holder">{{ profile.bank_holder || 'NAMA PEMILIK' }}</div>
              </div>
            </div>

            <!-- E-Wallet Form -->
            <div v-else class="payment-form">
              <div class="form-grid single-col">
                <div class="input-group">
                  <label>Jenis E-Wallet *</label>
                  <select v-model="profile.ewallet_type" class="input-field">
                    <option v-for="opt in ewalletOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="input-group">
                  <label>Nomor HP E-Wallet *</label>
                  <input v-model="profile.ewallet_number" type="tel" class="input-field" placeholder="08xxxxxxxxxx">
                </div>
              </div>

              <!-- Preview E-Wallet -->
              <div v-if="profile.ewallet_type" class="card-preview ewallet">
                <div class="ewallet-logo">{{ profile.ewallet_type }}</div>
                <div class="card-number">{{ profile.ewallet_number || '08xx-xxxx-xxxx' }}</div>
                <div class="ewallet-badge">Terhubung</div>
              </div>
            </div>
            
            <div class="payment-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p>Metode pembayaran yang dipilih akan digunakan untuk menerima pembayaran dari sistem.</p>
            </div>
            </div>
          </div>

          <!-- Account -->
          <div v-show="activeTab === 'account'" class="form-section">
            <h3 class="section-title">Pengaturan Akun</h3>
            <p class="section-subtitle">Kelola keamanan dan status akun Anda</p>
            
            <div class="account-card danger">
              <h4>Hapus Akun</h4>
              <p>Menghapus akun Anda secara permanen. Semua data histori les, transaksi, dan profil akan hilang dan tidak dapat dikembalikan.</p>
              <button type="button" class="btn-delete-account" @click="deleteAccount">Hapus Akun Permanen</button>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Base */
.dashboard { flex: 1; display: flex; flex-direction: column; width: 100%; min-height: 0; background: #f1f5f9; }
.main { flex: 1; padding: 24px; width: 100%; overflow-y: auto; }

/* Animation */
@keyframes spin { to { transform: rotate(360deg); } }
.spinning { animation: spin 1s linear infinite; }
.loading-state { text-align: center; padding: 60px; color: #64748b; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
.spinner-lg { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0c4a6e; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-content h1 { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
.header-content h1 svg { width: 28px; height: 28px; color: #0369a1; }
.subtitle { color: #64748b; font-size: 14px; margin-left: 40px; }

/* Buttons */
.btn-save { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #0369a1; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(3, 105, 161, 0.2); }
.btn-save:hover { background: #0284c7; transform: translateY(-1px); }
.btn-save:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
.btn-save svg { width: 18px; height: 18px; }

.btn-create { display: inline-block; padding: 10px 20px; background: #0369a1; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; margin-top: 12px; }

/* Profile Card */
.profile-header-card { display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; flex-wrap: wrap; gap: 20px; }
.profile-main { display: flex; align-items: center; gap: 20px; flex: 1; min-width: 300px; }
.avatar-wrapper { position: relative; width: 80px; height: 80px; }
.avatar-wrapper img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { background: linear-gradient(135deg, #0369a1, #0284c7); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; }
.btn-edit-avatar { position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; background: white; border: 1px solid #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0369a1; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.btn-edit-avatar svg { width: 14px; height: 14px; }
.name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.name-row h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
.badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge.pribadi { background: #f0fdf4; color: #16a34a; }
.badge.umum { background: #eff6ff; color: #2563eb; }
.badge.verified { background: #d1fae5; color: #059669; }
.badge.pending { background: #fef3c7; color: #d97706; }
.email { color: #64748b; font-size: 14px; margin: 4px 0 8px; }
.location { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; }
.location svg { width: 14px; height: 14px; color: #94a3b8; }

.profile-stats { display: flex; gap: 24px; }
.stat-box { text-align: center; padding: 12px 16px; border-radius: 12px; }
.stat-box.success { background: #d1fae5; }
.stat-box.success .stat-num { color: #059669; }
.stat-box.warning { background: #fef3c7; }
.stat-box.warning .stat-num { color: #d97706; }
.stat-num { display: block; font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
.stat-label { font-size: 12px; color: #64748b; font-weight: 500; }
.progress-ring { width: 44px; height: 44px; border-radius: 50%; background: conic-gradient(#0ea5e9 calc(var(--p)*1%), #e2e8f0 0); display: flex; align-items: center; justify-content: center; position: relative; margin: 0 auto 4px; }
.progress-ring::before { content: ''; position: absolute; inset: 4px; background: white; border-radius: 50%; }
.progress-ring span { position: relative; font-size: 11px; font-weight: 700; color: #0284c7; }

/* Tabs Nav */
.tabs-nav { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 24px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.tab-btn { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.tab-btn:hover { border-color: #cbd5e1; color: #475569; }
.tab-btn.active { background: #0369a1; color: white; border-color: #0369a1; box-shadow: 0 4px 6px -1px rgba(3, 105, 161, 0.2); }
.tab-icon svg { width: 18px; height: 18px; }

/* Tab Content */
.tab-content { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.section-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
.section-subtitle { font-size: 14px; color: #64748b; margin-top: -16px; margin-bottom: 24px; }

/* Form Styles */
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.form-grid.single-col { grid-template-columns: 1fr; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group.full { grid-column: span 2; }
.input-group label { font-size: 13px; font-weight: 600; color: #334155; }
.req { color: #dc2626; }
.input-field { padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; transition: border-color 0.2s; background: #fff; }
.input-field:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1); }
.input-field:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

/* Info Box & Hints */
.info-box { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #DBEAFE; border: 1px solid #93C5FD; border-radius: 10px; margin-bottom: 16px; }
.info-box svg { width: 20px; height: 20px; color: #2563EB; flex-shrink: 0; margin-top: 2px; }
.info-box strong { color: #1E40AF; }
.info-box small { color: #3B82F6; }
.field-hint { color: #0D5782; font-size: 12px; margin-top: 4px; font-style: italic; }

/* Finance Cards */
.finance-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 32px; }
.finance-divider { background: #e2e8f0; height: 100%; }
.card-preview { margin-top: 24px; border-radius: 16px; padding: 24px; color: white; position: relative; overflow: hidden; height: 180px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.card-preview.bank { background: linear-gradient(135deg, #0c4a6e, #0369a1); }
.card-preview.ewallet { background: linear-gradient(135deg, #059669, #10b981); }
.card-chip { width: 40px; height: 28px; background: rgba(255,255,255,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); }
.card-logo, .ewallet-logo { font-weight: 800; font-size: 18px; letter-spacing: 1px; text-align: right; }
.card-number { font-size: 20px; font-weight: 600; letter-spacing: 2px; text-align: center; margin: 10px 0; }
.card-holder { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; }
.ewallet-badge { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; align-self: flex-start; }

/* Payment Toggle */
.payment-toggle { display: flex; gap: 12px; margin-bottom: 24px; }
.toggle-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 20px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 15px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; }
.toggle-btn svg { width: 20px; height: 20px; }
.toggle-btn:hover { border-color: #0369a1; color: #0369a1; }
.toggle-btn.active { background: #e0f2fe; border-color: #0369a1; color: #0369a1; }
.payment-form { margin-top: 16px; }
.payment-note { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: #f0f9ff; border-radius: 10px; margin-top: 24px; }
.payment-note svg { width: 20px; height: 20px; color: #0369a1; flex-shrink: 0; margin-top: 2px; }
.payment-note p { font-size: 13px; color: #475569; line-height: 1.5; }

/* Invite Cards */
.invite-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.invite-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 16px; transition: all 0.2s; }
.invite-card:hover { border-color: #93c5fd; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.place-details h4 { font-weight: 700; font-size: 15px; margin-bottom: 2px; color: #1e293b; }
.place-type { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; }
.code-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; position: relative; }
.code-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
.code-value { font-size: 20px; font-weight: 700; color: #0369a1; letter-spacing: 3px; }
.code-actions { display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
.action-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #64748b; cursor: pointer; transition: all 0.2s; }
.action-btn:hover { background: #0369a1; border-color: #0369a1; color: white; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn svg { width: 14px; height: 14px; }

/* Responsive */
@media (max-width: 1024px) {
  .finance-grid { grid-template-columns: 1fr; }
  .finance-divider { width: 100%; height: 1px; }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; }

  .account-card{background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;margin-top:20px}
  .account-card.danger{border-color:#fee2e2;background:#fffafa}
  .account-card h4{font-size:16px;font-weight:600;margin-bottom:8px;color:#1e293b}
  .account-card.danger h4{color:#dc2626}
  .account-card p{font-size:14px;color:#64748b;margin-bottom:16px;line-height:1.5}
  .account-card.danger p{color:#7f1d1d}
  .btn-delete-account{padding:10px 20px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;transition:all 0.2s}
  .btn-delete-account:hover{background:#b91c1c}
  .profile-header-card { flex-direction: column; align-items: stretch; text-align: center; }
  .profile-main { flex-direction: column; }
  .name-row { justify-content: center; }
  .location { justify-content: center; }
  .profile-stats { justify-content: center; }
  .form-grid { grid-template-columns: 1fr; }
  .input-group.full { grid-column: span 1; }
}

.toast { position: fixed; bottom: 24px; right: 24px; background: #059669; color: white; padding: 12px 20px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 50; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { transform: translateY(20px); opacity: 0; }
.alert-box { padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
.alert-box.success { background: #dcfce7; color: #166534; }
.alert-box.error { background: #fee2e2; color: #991b1b; }

/* Toggle Switch for Les Place Active Status */
.toggle-box { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.toggle-box.active { background: #d1fae5; }
.toggle-box.inactive { background: #fee2e2; }
.toggle-switch { position: relative; display: inline-block; width: 50px; height: 26px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: 0.3s; border-radius: 26px; }
.toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.toggle-switch input:checked + .toggle-slider { background-color: #10b981; }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(24px); }
.toggle-switch.disabled { opacity: 0.6; cursor: not-allowed; }
.toggle-switch.disabled .toggle-slider { cursor: not-allowed; }
</style>
