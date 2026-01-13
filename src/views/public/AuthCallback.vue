<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const status = ref('Memproses login...')
const error = ref('')

const handleLoginSuccess = async (user) => {
  try {
    // Ambil role dan owner type yang menunggu dari localStorage
    const pendingRole = localStorage.getItem('pendingRole')
    const pendingOwnerType = localStorage.getItem('pendingOwnerType') || 'umum'
    // Untuk pengajar - ambil data kode undangan
    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    
    // Tentukan apakah ini percobaan registrasi (punya pendingRole) atau percobaan login (tidak punya pendingRole)
    const isRegistrationAttempt = !!pendingRole
    
    // 1. Cek apakah pengguna sudah ada di DB
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single()
      
    let roleToUse = pendingRole || 'student'
    let isNewUser = false
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]

    if (existingUser) {
      // PENGGUNA SUDAH ADA: Gunakan role aktual mereka dari DB (yang seharusnya sudah benar berkat Trigger + Metadata)
      console.log('User found in DB, using existing role:', existingUser.role)
      roleToUse = existingUser.role
      
      // Jika ini percobaan registrasi, kita HARUS memastikan data profil (seperti les_places) dibuat
      // Trigger membuat public.users dan entri role sederhana, tapi melewatkan data kompleks seperti les_places
      
      // Jika role cocok, perlakukan sebagai login kecuali kita curiga profil tidak lengkap
      if (isRegistrationAttempt && pendingRole === existingUser.role) {
         status.value = `Selamat datang kembali, ${existingUser.name || userName}!`
      } else if (isRegistrationAttempt && pendingRole !== existingUser.role) {
        // Role tidak cocok saat registrasi = Upgrade/Cek Role
        console.log(`User intent to change role from ${existingUser.role} to ${pendingRole}`)
        
        status.value = `Mengupdate profil ke ${getRoleLabel(pendingRole)}...`
        
        // Panggil RPC untuk upgrade role
        const { data: upgradeResult, error: upgradeError } = await supabase.rpc('upgrade_user_role', {
          target_user_id: user.id,
          new_role: pendingRole,
          new_owner_type: pendingOwnerType
        })
        
        if (upgradeError) {
          console.error('Failed to upgrade role:', upgradeError)
          // Fallback ke role yang ada jika upgrade gagal
          roleToUse = existingUser.role 
          error.value = 'Gagal memperbarui role akun. Masuk sebagai role lama.'
        } else {
           console.log('Role upgrade success:', upgradeResult)
           roleToUse = pendingRole
           isNewUser = true // Perlakukan sebagai baru untuk memastikan setup profil tambahan jika diperlukan
        }
      } else {
        // Login standar
        status.value = `Selamat datang kembali, ${existingUser.name || userName}!`
      }
    } else {
      // PENGGUNA BARU (Tidak ditemukan di public.users - mungkin delay trigger, atau benar-benar baru)
      
      // ... (Pengecekan percobaan login disingkat, logika tetap sama)
      if (!isRegistrationAttempt) {
         // ... (Logika percobaan login tanpa akun)
         console.log('Login attempt with unregistered Google account')
         error.value = 'Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.'
         await supabase.auth.signOut()
         localStorage.removeItem('pendingRole')
         // ... bersihkan lainnya
         setTimeout(() => router.push('/register'), 3000)
         return
      }
      
      isNewUser = true
      console.log('New user detected, registering as:', pendingRole)
      status.value = 'Membuat profil pengguna baru...'
      
      // Upsert pengguna awal (Redundan jika trigger berjalan, tapi aman)
      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        name: userName,
        role: pendingRole
      }, { onConflict: 'id' })
      if (upsertError) throw upsertError
    }

    // --- LOGIKA PEMBUATAN/PENJAMINAN PROFIL ---
    // Berjalan jika isNewUser (yang true untuk pengguna benar-benar baru ATAU percobaan registrasi pada pengguna yang ada)
    if (isNewUser) {
       // Buat/Pastikan catatan khusus role
      if (pendingRole === 'owner') {
        // Buat catatan owner
        const { data: ownerData, error: ownerError } = await supabase
          .from('owners')
          .upsert({
            user_id: user.id,
            owner_type: pendingOwnerType || 'umum',
            business_name: userName + "'s Business"
          }, { onConflict: 'user_id' })
          .select('id')
          .single()
        
        if (ownerData && !ownerError) {
          // BUAT OTOMATIS LES_PLACE untuk owner
          await supabase.from('les_places').upsert({
            owner_id: ownerData.id,
            name: userName + "'s Les",
            description: 'Selamat datang di tempat les kami!',
            type: 'offline',
            address: 'Alamat belum diisi',
            is_verified: false,
            is_active: true,
            // ... (default)
            total_students: 0,
            rating: 0,
            total_reviews: 0
          }, { onConflict: 'owner_id' }) // Only insert if not exists (or update)
          
           // Jika owner pribadi, juga buat catatan teacher
          if (pendingOwnerType === 'pribadi') {
            await supabase.from('teachers').upsert({
              user_id: user.id,
              owner_id: ownerData.id,
              is_available: true
            }, { onConflict: 'user_id' })
          }
        }
      } else if (pendingRole === 'student') {
        await supabase.from('students').upsert({
          user_id: user.id
        }, { onConflict: 'user_id' })
      } else if (pendingRole === 'teacher') {
        const teacherData = { user_id: user.id, is_available: true }
        if (pendingLesPlaceId) teacherData.les_place_id = pendingLesPlaceId
        if (pendingOwnerId) teacherData.owner_id = pendingOwnerId
        
        await supabase.from('teachers').upsert(teacherData, { onConflict: 'user_id' })
        
        if (pendingInviteCode) {
           // Kita bisa panggil RPC atau percaya bahwa sudah ditangani
        }
      }
    }
    
    // Bersihkan localStorage
    localStorage.removeItem('pendingRole')
    localStorage.removeItem('pendingOwnerType')
    localStorage.removeItem('pendingInviteCode')
    localStorage.removeItem('pendingLesPlaceId')
    localStorage.removeItem('pendingOwnerId')
    
    // Refresh profil auth store
    await authStore.fetchUserProfile()
    
    status.value = 'Selesai! Mengalihkan...'
    
    // Redirect berdasarkan role FINAL
    const targetPath = roleToUse === 'student' ? '/' : `/${roleToUse}/dashboard`
    console.log('Redirecting to:', targetPath)
    
    // Gunakan hard redirect untuk memastikan state bersih dan menghindari masalah router stuck
    window.location.href = targetPath
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = 'Terjadi kesalahan saat memproses data akun.'
    setTimeout(() => router.push('/login'), 3000)
  }
}

onMounted(async () => {
  status.value = 'Memvalidasi sesi login...'
  
  // 0. CEK APAKAH INI RESET PASSWORD FLOW
  // Supabase mengirim type=recovery di hash URL untuk reset password
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const authType = hashParams.get('type')
  
  if (authType === 'recovery') {
    // Ini adalah flow reset password, redirect ke halaman update-password
    status.value = 'Mengalihkan ke halaman reset password...'
    
    // Tunggu session ter-set oleh Supabase
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // Session berhasil, redirect ke update-password
      window.location.href = '/update-password'
    } else {
      // Jika session belum ready, tunggu sebentar
      setTimeout(() => {
        window.location.href = '/update-password'
      }, 1000)
    }
    return
  }
  
  // 1. Cek sesi langsung terlebih dahulu
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (session?.user) {
    await handleLoginSuccess(session.user)
    return
  }

  // 2. Jika tidak ada sesi langsung, dengarkan perubahan state auth (Pemrosesan Hash)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await handleLoginSuccess(session.user)
    } else if (event === 'SIGNED_OUT') {
      // Opsional: Tangani sign out jika diperlukan, tapi utamanya kita tunggu SIGNED_IN
      // Jangan error langsung, tunggu sebentar
    }
  })

  // 3. Fallback timeout jika tidak terjadi apa-apa
  setTimeout(() => {
    if (status.value === 'Memvalidasi sesi login...') {
      error.value = 'Gagal memvalidasi login Google. Waktu habis.'
      setTimeout(() => router.push('/login'), 3000)
    }
  }, 10000) // 10 seconds timeout
})
// Helper untuk mendapatkan label role
function getRoleLabel(role) {
  const labels = {
    'student': 'Siswa',
    'owner': 'Pemilik Bimbel',
    'teacher': 'Guru',
    'admin': 'Admin'
  }
  return labels[role] || role
}
</script>

<template>
  <div class="auth-callback">
    <div class="callback-card">
      <div v-if="!error" class="loading-state">
        <div class="spinner"></div>
        <p>{{ status }}</p>
      </div>
      <div v-else class="error-state">
        <span class="error-icon">!</span>
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  padding: 20px;
}

.callback-card {
  background: white;
  padding: 48px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  min-width: 320px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #4b5563;
  font-size: 16px;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.error-icon {
  width: 48px;
  height: 48px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.error-state p {
  color: #dc2626;
  font-size: 16px;
}
</style>
