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
  
  // Alamat
  address: '', province_id: '', province_name: '', city_id: '', city_name: '',
  
  // Bank & E-Wallet
  payment_type: 'bank', // 'bank' or 'ewallet'
  bank_name: '', bank_account: '', bank_holder: '',
  ewallet_type: '', ewallet_number: ''
})



const lesPlaces = ref([])
const provinces = ref([])
const cities = ref([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)
const loadingLesPlaces = ref(false)
const togglingActive = ref(false)

// Computed: Completion Percentage
const completionPercent = computed(() => {
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
  
  const hasPayment = profile.value.payment_type === 'bank' 
    ? (profile.value.bank_name && profile.value.bank_account)
    : (profile.value.ewallet_type && profile.value.ewallet_number)
  
  const fields = [...baseFields, hasPayment]
  const filled = fields.filter(f => f && f.toString().length > 0).length
  return Math.round((filled / fields.length) * 100)
})

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
  await fetchStats()
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
        company_name: ownerData.business_name || ownerData.company_name || '', 
        business_type: ownerData.business_type || '',
        business_desc: ownerData.description || '',
        npwp: ownerData.npwp || '', 
        nik: ownerData.nik || '',
        province_id: ownerData.province_id || '', 
        province_name: ownerData.province_name || '',
        city_id: ownerData.city_id || '', 
        city_name: ownerData.city_name || '',
        payment_type: ownerData.payment_type || 'bank',
        bank_name: ownerData.bank_name || '', 
        bank_account: ownerData.bank_account || '', 
        bank_holder: ownerData.bank_holder || '',
        ewallet_type: ownerData.ewallet_type || '', 
        ewallet_number: ownerData.ewallet_number || ''
      })
      
      if (!profile.value.address && ownerData.business_address) {
        profile.value.address = ownerData.business_address
      }
      if (!profile.value.phone && ownerData.business_phone) {
        profile.value.phone = ownerData.business_phone
      }
      
      if (ownerData.province_id) await fetchCities(ownerData.province_id)
    }
    
    if (lesPlaceData) {
      if (!profile.value.address && lesPlaceData.address) {
        profile.value.address = lesPlaceData.address
      }
      
      if (!profile.value.province_id && lesPlaceData.province) {
        const matchedProvince = provinces.value.find(p => 
          p.name.toUpperCase().includes(lesPlaceData.province.toUpperCase()) ||
          lesPlaceData.province.toUpperCase().includes(p.name.toUpperCase())
        )
        if (matchedProvince) {
          profile.value.province_id = matchedProvince.id
          profile.value.province_name = matchedProvince.name
          await fetchCities(matchedProvince.id)
          
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
  if (lesPlaces.value.length > 0) {
    const isPrivate = lesPlaces.value.some(lp => lp.is_private)
    profile.value.owner_type = isPrivate ? 'pribadi' : 'umum'
  }
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
    const { data, error } = await supabase
      .from('les_places_with_owner')
      .select('id, name, is_private, is_verified, is_active, owner_name, owner_email')
      .eq('owner_email', authStore.user.email)
    
    if (error) {
       lesPlaces.value = []
    } else {
      lesPlaces.value = data || []
    }
  } catch (err) { 
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

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    message.value = { type: '', text: '' }
    const fileExt = file.name.split('.').pop()
    const fileName = `${authStore.user.id}-${Date.now()}.${fileExt}`
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
    setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
  } catch (err) {
    message.value = { type: 'error', text: 'Gagal upload: ' + err.message }
  }
}

async function handleSave() {
  saving.value = true
  message.value = { type: '', text: '' }
  try {
    const { error: uErr } = await supabase.from('users').update({
      name: profile.value.name, 
      phone: profile.value.phone, 
      gender: profile.value.gender,
      birth_date: profile.value.birth_date || null, 
      address: profile.value.address
    }).eq('id', authStore.user.id)
    if (uErr) throw uErr

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
    message.value = { type: 'error', text: 'Gagal menghapus akun: ' + err.message }
  }
}
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="page-header">
        <h1>Profil & Bisnis</h1>
        <p>Kelola identitas diri dan informasi bisnis Anda</p>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Memuat profil...</p>
      </div>

      <div v-else class="profile-layout">
        <!-- Sidebar -->
        <aside class="profile-sidebar">
          <div class="avatar-card">
            <div class="avatar">
              <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.name">
              <span v-else class="avatar-placeholder">{{ profile.name?.charAt(0)?.toUpperCase() || '?' }}</span>
            </div>
            <h3>{{ profile.name || 'Nama Pemilik' }}</h3>
            <p class="email">{{ profile.email }}</p>
             <div class="badges-row">
                <span class="badge" :class="profile.owner_type">Owner {{ profile.owner_type === 'pribadi' ? 'Pribadi' : 'Umum' }}</span>
                <span v-if="lesPlaces.length > 0" class="badge" :class="lesPlaces[0]?.is_verified ? 'verified' : 'pending'">
                  {{ lesPlaces[0]?.is_verified ? 'Terverifikasi' : 'Pending' }}
                </span>
             </div>
            <label class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Ubah Foto
              <input type="file" accept="image/*" hidden @change="handleAvatarUpload">
            </label>
          </div>

          <div class="info-card">
            <h4>Status Akun</h4>
            <div class="info-item">
              <span class="label">Kelengkapan</span>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: completionPercent + '%' }"></div>
                </div>
                <span class="value">{{ completionPercent }}%</span>
              </div>
            </div>

            <!-- Status Tempat Les Toggle in Sidebar -->
            <div v-if="lesPlaces.length > 0" class="status-toggle-box">
              <span class="label">Status Tempat Les</span>
              <div class="toggle-row">
                 <label class="toggle-switch" :class="{ disabled: togglingActive }">
                  <input 
                    type="checkbox" 
                    :checked="lesPlaces[0]?.is_active ?? true" 
                    :disabled="togglingActive"
                    @change="toggleLesPlaceActive(lesPlaces[0])"
                  >
                  <span class="toggle-slider"></span>
                </label>
                <span class="status-text" :class="(lesPlaces[0]?.is_active ?? true) ? 'active' : 'inactive'">
                  {{ (lesPlaces[0]?.is_active ?? true) ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
            </div>


          </div>
        </aside>

        <!-- Main Content -->
        <div class="profile-form-container">
          <div v-if="message.text || showSaved" class="alert" :class="message.type || 'success'">
            <svg v-if="message.type === 'success' || showSaved" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            {{ showSaved ? 'Profil berhasil disimpan!' : message.text }}
          </div>

          <div class="tabs">
            <button v-for="tab in tabs" :key="tab.id" :class="['tab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
              <svg v-if="tab.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <svg v-else-if="tab.icon === 'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="9" y1="22" x2="9" y2="22"></line><path d="M9 22v-4h6v4"></path></svg>
              <svg v-else-if="tab.icon === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <svg v-else-if="tab.icon === 'credit-card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <svg v-else-if="tab.icon === 'key'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
              {{ tab.label }}
            </button>
          </div>

          <form class="profile-form" @submit.prevent="handleSave">
             <!-- Identity -->
            <div v-show="activeTab === 'identity'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Pribadi</h3>
                  <p>Data diri pemilik akun</p>
                </div>
                 <div class="form-row">
                  <div class="form-group">
                    <label>Nama Lengkap <span class="required">*</span></label>
                    <input v-model="profile.name" type="text" placeholder="Nama sesuai KTP">
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input :value="profile.email" type="email" disabled>
                    <span class="hint">Email tidak dapat diubah</span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Nomor Telepon <span class="required">*</span></label>
                    <input v-model="profile.phone" type="tel" placeholder="08xxxxxxxxxx">
                  </div>
                  <div class="form-group">
                    <label>NIK</label>
                    <input v-model="profile.nik" type="text" placeholder="16 digit NIK" maxlength="16">
                  </div>
                </div>
                <div class="form-row">
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
              </div>
            </div>

             <!-- Business -->
            <div v-show="activeTab === 'business'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Bisnis</h3>
                  <p>Detail usaha atau tempat les Anda</p>
                </div>
                <div class="form-group">
                   <label>Nama Usaha / Bimbel</label>
                   <input v-model="profile.company_name" type="text" placeholder="Contoh: Ganesha Operation Cabang X">
                </div>
                 <div class="form-row">
                  <div class="form-group">
                     <label>Jenis Usaha</label>
                     <select v-model="profile.business_type">
                      <option v-for="opt in businessTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                     <label>NPWP (Opsional)</label>
                     <input v-model="profile.npwp" type="text" placeholder="00.000.000.0-000.000">
                  </div>
                </div>
              </div>
            </div>

             <!-- Address -->
            <div v-show="activeTab === 'address'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Alamat & Lokasi</h3>
                  <p>Lokasi basis operasional atau tempat tinggal</p>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Provinsi</label>
                    <select :value="profile.province_id" :disabled="loadingProvinces" @change="onProvinceChange">
                      <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih Provinsi' }}</option>
                      <option v-for="p in provinces" :key="p.id" :value="p.id">{{ p.name }}</option>
                    </select>
                  </div>
                   <div class="form-group">
                    <label>Kota / Kabupaten</label>
                    <select :value="profile.city_id" :disabled="!profile.province_id || loadingCities" @change="onCityChange">
                      <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih Kota/Kabupaten' }}</option>
                      <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                  </div>
                </div>
                 <div class="form-group">
                  <label>Alamat Lengkap</label>
                  <textarea v-model="profile.address" rows="3" placeholder="Nama Jalan, RT/RW, Kelurahan"></textarea>
                </div>
              </div>
            </div>

            <!-- Bank -->
            <div v-show="activeTab === 'bank'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Metode Pembayaran</h3>
                  <p>Untuk kebutuhan transaksi dan pencairan dana</p>
                </div>
                
                 <div class="payment-type-toggle">
                  <button type="button" :class="{ active: profile.payment_type === 'bank' }" @click="profile.payment_type = 'bank'">Transfer Bank</button>
                  <button type="button" :class="{ active: profile.payment_type === 'ewallet' }" @click="profile.payment_type = 'ewallet'">E-Wallet</button>
                </div>

                 <div v-if="profile.payment_type === 'bank'" class="payment-form">
                   <div class="form-group">
                    <label>Nama Bank</label>
                    <select v-model="profile.bank_name">
                      <option v-for="opt in bankOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Nomor Rekening</label>
                      <input v-model="profile.bank_account" type="text" placeholder="Nomor rekening">
                    </div>
                     <div class="form-group">
                      <label>Atas Nama</label>
                      <input v-model="profile.bank_holder" type="text" placeholder="Nama pemilik rekening">
                    </div>
                  </div>
                  <!-- Card Preview -->
                   <div v-if="profile.bank_name" class="card-preview bank">
                      <div class="card-chip"></div>
                      <div class="card-logo">{{ profile.bank_name }}</div>
                      <div class="card-number">{{ profile.bank_account || '•••• •••• ••••' }}</div>
                      <div class="card-holder">{{ profile.bank_holder || 'NAMA PEMILIK' }}</div>
                   </div>
                </div>

                <div v-else class="payment-form">
                   <div class="form-group">
                    <label>Jenis E-Wallet</label>
                    <select v-model="profile.ewallet_type">
                      <option v-for="opt in ewalletOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Nomor E-Wallet</label>
                    <input v-model="profile.ewallet_number" type="text" placeholder="Nomor HP terdaftar">
                  </div>
                   <!-- Ewallet Preview -->
                   <div v-if="profile.ewallet_type" class="card-preview ewallet">
                      <div class="ewallet-logo">{{ profile.ewallet_type }}</div>
                      <div class="card-number">{{ profile.ewallet_number || '08xx-xxxx-xxxx' }}</div>
                   </div>
                </div>
              </div>
            </div>

             <!-- Account Tab -->
            <div v-show="activeTab === 'account'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Pengaturan Akun</h3>
                  <p>Kelola keamanan akun Anda</p>
                </div>
                 <div class="danger-zone">
                     <h4>Hapus Akun</h4>
                     <p>Menghapus akun Anda secara permanen. Semua data akan hilang.</p>
                     <button type="button" class="btn-danger" @click="deleteAccount">Hapus Akun Permanen</button>
                  </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spinner-sm"></span>
                {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F1F5F9; }
.main { flex: 1; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #1E293B; }
.page-header p { color: #64748B; font-size: 14px; }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

.profile-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; }
.profile-sidebar { display: flex; flex-direction: column; gap: 16px; }

.avatar-card { background: white; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.avatar { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 16px; background: #0A4568; display: flex; align-items: center; justify-content: center; overflow: hidden; color: white; font-size: 32px; font-weight: 700; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; color: #1E293B; }
.avatar-card .email { font-size: 13px; color: #64748B; margin-bottom: 16px; }
.badges-row { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #E2E8F0; color: #64748B; }
.badge.pribadi { background: #DBEAFE; color: #1E40AF; }
.badge.umum { background: #E0E7FF; color: #3730A3; }
.badge.verified { background: #D1FAE5; color: #047857; }
.badge.pending { background: #FEF3C7; color: #B45309; }

.upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #F8FAFC; color: #0A4568; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.upload-btn:hover { background: #E2E8F0; }
.upload-btn svg { width: 16px; height: 16px; }

.info-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.info-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #1E293B; }
.info-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; }
.info-item:last-child { margin-bottom: 0; }
.info-item .label { color: #64748B; }
.info-item .value { font-weight: 600; color: #1E293B; text-align: right; max-width: 60%; }

.progress-container { width: 100px; display: flex; align-items: center; gap: 8px; }
.progress-bar { flex: 1; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #0A4568; }

.status-toggle-box { background: #F8FAFC; border-radius: 12px; padding: 12px; margin: 16px 0; border: 1px solid #E2E8F0; }
.status-toggle-box .label { font-size: 12px; color: #64748B; display: block; margin-bottom: 8px; font-weight: 600; }
.toggle-row { display: flex; align-items: center; gap: 12px; }
.status-text { font-size: 13px; font-weight: 600; }
.status-text.active { color: #10B981; }
.status-text.inactive { color: #94A3B8; }

.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 24px; }
.toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background-color: #10B981; }
input:checked + .toggle-slider:before { transform: translateX(20px); }
.toggle-switch.disabled { opacity: 0.6; pointer-events: none; }

.profile-form-container { flex: 1; }
.alert { padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; }
.alert.success { background: #D1FAE5; color: #047857; }
.alert.error { background: #FEE2E2; color: #B91C1C; }
.alert svg { width: 20px; height: 20px; }

.tabs { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
.tab { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid transparent; border-radius: 10px; font-size: 14px; font-weight: 600; color: #64748B; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.tab:hover { background: #F8FAFC; }
.tab.active { background: #0A4568; color: white; box-shadow: 0 4px 6px -1px rgba(10, 69, 104, 0.1); }
.tab svg { width: 18px; height: 18px; }

.profile-form { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.section-header { margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px; }
.section-header h3 { font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.section-header p { font-size: 14px; color: #64748B; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.form-group label { font-size: 14px; font-weight: 600; color: #475569; }
.required { color: #EF4444; }
.form-group input, .form-group select, .form-group textarea { padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; width: 100%; transition: all 0.2s; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0A4568; ring: 2px solid rgba(10, 69, 104, 0.1); }
.form-group input:disabled { background: #F1F5F9; color: #94A3B8; }
.hint { font-size: 12px; color: #94A3B8; margin-top: 4px; }

.payment-type-toggle { display: flex; gap: 10px; margin-bottom: 20px; }
.payment-type-toggle button { flex: 1; padding: 12px; background: #F1F5F9; border: 2px solid transparent; border-radius: 10px; font-weight: 600; color: #64748B; cursor: pointer; }
.payment-type-toggle button.active { background: #FOF9FF; border-color: #0A4568; color: #0A4568; }

.card-preview { background: linear-gradient(135deg, #0A4568 0%, #062E46 100%); color: white; border-radius: 16px; padding: 20px; max-width: 340px; margin-top: 10px; position: relative; overflow: hidden; }
.card-preview.ewallet { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
.card-chip { width: 40px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 6px; margin-bottom: 20px; }
.card-logo { font-size: 18px; font-weight: 700; position: absolute; top: 20px; right: 20px; opacity: 0.8; }
.ewallet-logo { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card-number { font-size: 22px; margin-bottom: 12px; letter-spacing: 2px; font-family: monospace; }
.card-holder { font-size: 14px; text-transform: uppercase; opacity: 0.9; }

.danger-zone h4 { color: #DC2626; margin-bottom: 8px; }
.danger-zone p { color: #64748B; font-size: 14px; margin-bottom: 16px; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid #E2E8F0; }
.btn-save { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-save:hover { background: #083350; }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-danger { padding: 10px 20px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger:hover { background: #FECACA; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

@media (max-width: 1024px) {
  .profile-layout { grid-template-columns: 1fr; }
  .profile-sidebar { flex-direction: row; flex-wrap: wrap; }
  .avatar-card, .info-card { flex: 1; min-width: 250px; }
}
</style>
