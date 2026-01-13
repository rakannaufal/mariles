<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
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

const tabs = [
  { id: 'identity', label: 'Identitas', icon: 'user' },
  { id: 'professional', label: 'Profesional', icon: 'graduation' },
  { id: 'address', label: 'Alamat', icon: 'location' },
  { id: 'bank', label: 'Rekening', icon: 'credit-card' },
  { id: 'workplace', label: 'Tempat Les', icon: 'workplace' },
  { id: 'account', label: 'Akun', icon: 'shield' }
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

// Account Functions
const passwordForm = ref({ newPassword: '', confirmPassword: '' })
const passwordMsg = ref({ type: '', text: '' })

async function updatePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordMsg.value = { type: 'error', text: 'Konfirmasi password tidak cocok' }
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    passwordMsg.value = { type: 'error', text: 'Password minimal 6 karakter' }
    return
  }

  saving.value = true
  passwordMsg.value = { type: '', text: '' }
  try {
    const { error } = await supabase.auth.updateUser({ password: passwordForm.value.newPassword })
    if (error) throw error
    passwordMsg.value = { type: 'success', text: 'Password berhasil diupdate' }
    passwordForm.value = { newPassword: '', confirmPassword: '' }
  } catch(e) {
    passwordMsg.value = { type: 'error', text: e.message }
  } finally {
    saving.value = false
  }
}

async function deleteAccount() {
  if (!confirm('HAPUS AKUN? Data tidak bisa kembali!')) return
  if (!confirm('Yakin 100%?')) return
  
  try {
     const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: authStore.user.id }
     })
     if (error) throw error
     if (data && !data.success) throw new Error(data.error)
     
     await authStore.signOut()
     router.push('/')
  } catch(e) {
    alert('Gagal: ' + e.message)
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
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="page-header">
        <h1>Profil Saya</h1>
        <p>Kelola data profil dan informasi profesional Anda</p>
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
            <h3>{{ profile.name || 'Nama Guru' }}</h3>
            <p class="email">{{ profile.email }}</p>
            <label class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Ubah Foto
              <input type="file" accept="image/*" hidden @change="handleAvatarUpload">
            </label>
          </div>

          <div class="info-card">
            <h4>Status & Statistik</h4>
            <div class="info-item">
              <span class="label">Kelengkapan</span>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: completionPercent + '%' }"></div>
                </div>
                <span class="value">{{ completionPercent }}%</span>
              </div>
            </div>
            <div class="info-item">
              <span class="label">Pengalaman</span>
              <span class="value">{{ profile.experience_years }} Tahun</span>
            </div>
             <div class="info-item" v-if="profile.qualification">
              <span class="label">Pendidikan</span>
              <span class="value">{{ profile.qualification }}</span>
            </div>
             <div class="info-item">
              <span class="label">Tempat Les</span>
              <span class="value">{{ profile.les_place_name || 'Belum terhubung' }}</span>
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

          <!-- Tabs -->
          <div class="tabs">
            <button v-for="tab in tabs" :key="tab.id" :class="['tab', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
              <svg v-if="tab.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <svg v-else-if="tab.icon === 'graduation'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
              <svg v-else-if="tab.icon === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <svg v-else-if="tab.icon === 'credit-card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              <svg v-else-if="tab.icon === 'workplace'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              <svg v-else-if="tab.icon === 'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              {{ tab.label }}
            </button>
          </div>

          <form class="profile-form" @submit.prevent="handleSave">
             <!-- Identity Tab -->
            <div v-show="activeTab === 'identity'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Informasi Identitas Dasar</h3>
                  <p>Informasi pribadi untuk keperluan administrasi</p>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Nama Lengkap <span class="required">*</span></label>
                    <input v-model="profile.name" type="text" placeholder="Nama lengkap Anda">
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

            <!-- Professional Tab -->
            <div v-show="activeTab === 'professional'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Kualifikasi Profesional</h3>
                  <p>Detail pengalaman dan spesialisasi mengajar</p>
                </div>
                
                <div class="form-group">
                  <label>Program yang Ditugaskan</label>
                  <div class="tags-container">
                     <span v-for="(spec, i) in profile.specialization" :key="i" class="tag">{{ spec }}</span>
                     <span v-if="!profile.specialization.length" class="empty-text">Belum ada program yang ditugaskan</span>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Pengalaman Mengajar (Tahun)</label>
                     <input v-model.number="profile.experience_years" type="number" min="0" max="50">
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
                   <textarea v-model="profile.bio" rows="4" placeholder="Ceritakan pengalaman dan metode mengajar Anda..."></textarea>
                   <span class="hint">{{ profile.bio?.length || 0 }} / 500 karakter</span>
                </div>
              </div>
            </div>

            <!-- Address Tab -->
            <div v-show="activeTab === 'address'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Alamat Domisili</h3>
                  <p>Lokasi tempat tinggal Anda saat ini</p>
                </div>
                <div class="form-row">
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
                </div>
                <div class="form-group">
                  <label>Alamat Lengkap</label>
                  <textarea v-model="profile.address" rows="3" placeholder="Jl. Contoh No. 123, RT/RW"></textarea>
                </div>
              </div>
            </div>

             <!-- Bank Tab -->
            <div v-show="activeTab === 'bank'" class="tab-content">
              <div class="form-section">
                 <div class="section-header">
                  <h3>Rekening Pembayaran</h3>
                  <p>Rekening untuk penerimaan gaji</p>
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
                </div>
              </div>
            </div>

            <!-- Workplace Tab -->
            <div v-show="activeTab === 'workplace'" class="tab-content">
               <div class="form-section">
                 <div class="section-header">
                  <h3>Tempat Les</h3>
                  <p>Informasi tempat les tempat Anda mengajar</p>
                </div>

                <div v-if="profile.les_place_name" class="workplace-card">
                   <div class="wp-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                   </div>
                   <div class="wp-info">
                      <h4>{{ profile.les_place_name }}</h4>
                      <span class="wp-type">{{ profile.les_place_type }}</span>
                      <p v-if="profile.les_place_address">{{ profile.les_place_address }}, {{ profile.les_place_city }}</p>
                   </div>
                   <div class="wp-onwer" v-if="profile.owner_name">
                      <small>Pemilik: {{ profile.owner_name }}</small>
                   </div>
                </div>
                <div v-else class="empty-state">
                   <p>Anda belum terhubung dengan tempat les manapun.</p>
                </div>
              </div>
            </div>

            <!-- Account Tab -->
            <div v-show="activeTab === 'account'" class="tab-content">
              <div class="form-section">
                <div class="section-header">
                  <h3>Keamanan Akun</h3>
                  <p>Ubah password dan pengaturan sensitif lainnya</p>
                </div>
                 <div class="form-group">
                    <label>Password Baru</label>
                    <input v-model="passwordForm.newPassword" type="password" placeholder="Minimal 6 karakter">
                  </div>
                   <div class="form-group">
                    <label>Konfirmasi Password</label>
                    <input v-model="passwordForm.confirmPassword" type="password" placeholder="Ulangi password baru">
                  </div>
                  <div class="form-actions" style="justify-content: flex-start; margin-top: 10px;">
                     <button type="button" class="btn-secondary" @click="updatePassword">Update Password</button>
                  </div>
                  <div v-if="passwordMsg.text" :class="['msg', passwordMsg.type]" style="margin-top: 10px;">{{ passwordMsg.text }}</div>
              
                  <hr class="divider">
                  
                  <div class="danger-zone">
                     <h4>Hapus Akun</h4>
                     <p>Data akan dihapus permanen dan tidak dapat dipulihkan.</p>
                     <button type="button" class="btn-danger" @click="deleteAccount">Hapus Akun</button>
                  </div>
              </div>
            </div>

            <div class="form-actions" v-if="activeTab !== 'workplace'">
              <button type="submit" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spinner-sm"></span>
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
.progress-fill { height: 100%; background: #10B981; }

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
.form-section { margin-bottom: 0; }
.section-header { margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px; }
.section-header h3 { font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.section-header p { font-size: 14px; color: #64748B; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { font-size: 14px; font-weight: 600; color: #475569; }
.required { color: #EF4444; }
.form-group input, .form-group select, .form-group textarea { padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; width: 100%; transition: all 0.2s; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0A4568; ring: 2px solid rgba(10, 69, 104, 0.1); }
.form-group input:disabled { background: #F1F5F9; color: #94A3B8; }
.hint { font-size: 12px; color: #94A3B8; margin-top: 4px; }

.tags-container { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { padding: 4px 12px; background: #DBEAFE; color: #1D4ED8; border-radius: 20px; font-size: 13px; font-weight: 500; }
.empty-text { font-size: 14px; color: #94A3B8; font-style: italic; }

.payment-type-toggle { display: flex; gap: 10px; margin-bottom: 20px; }
.payment-type-toggle button { flex: 1; padding: 12px; background: #F1F5F9; border: 2px solid transparent; border-radius: 10px; font-weight: 600; color: #64748B; cursor: pointer; }
.payment-type-toggle button.active { background: #FOF9FF; border-color: #0A4568; color: #0A4568; }

.workplace-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; display: flex; align-items: start; gap: 16px; }
.wp-icon { width: 48px; height: 48px; background: #0A4568; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wp-icon svg { width: 24px; height: 24px; }
.wp-info h4 { font-size: 16px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.wp-type { display: inline-block; padding: 2px 8px; background: #DBEAFE; color: #1E40AF; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
.wp-info p { font-size: 14px; color: #64748B; }
.wp-onwer { margin-left: auto; text-align: right; color: #64748B; font-size: 13px; }

.empty-state { text-align: center; padding: 40px; border: 2px dashed #E2E8F0; border-radius: 12px; color: #94A3B8; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid #E2E8F0; }
.btn-save { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-save:hover { background: #083350; }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-secondary { padding: 10px 20px; background: #F1F5F9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #E2E8F0; }
.btn-danger { padding: 10px 20px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger:hover { background: #FECACA; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.divider { border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0; }
.danger-zone h4 { color: #DC2626; margin-bottom: 8px; }
.danger-zone p { color: #64748B; font-size: 14px; margin-bottom: 16px; }

@media (max-width: 1024px) {
  .profile-layout { grid-template-columns: 1fr; }
  .profile-sidebar { flex-direction: row; flex-wrap: wrap; }
  .avatar-card, .info-card { flex: 1; min-width: 250px; }
}
</style>
