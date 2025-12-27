<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const status = ref('Memproses login...')
const error = ref('')

onMounted(async () => {
  try {
    // Get pending role and owner type from localStorage
    const pendingRole = localStorage.getItem('pendingRole') || 'student'
    const pendingOwnerType = localStorage.getItem('pendingOwnerType') || 'umum'
    // For teachers - get invite code data
    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    const pendingLesPlaceId = localStorage.getItem('pendingLesPlaceId')
    const pendingOwnerId = localStorage.getItem('pendingOwnerId')
    
    status.value = 'Mengambil data akun...'
    
    // Wait for session to be established
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      error.value = 'Gagal mendapatkan data akun. Silakan coba lagi.'
      setTimeout(() => router.push('/login'), 2000)
      return
    }
    
    status.value = 'Membuat profil pengguna...'
    
    // Create/update user profile with role
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]
    
    const { error: upsertError } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: userName,
      role: pendingRole
    }, { onConflict: 'id' })
    
    if (upsertError) {
      console.error('Error creating user profile:', upsertError)
    }
    
    status.value = 'Menyiapkan akun Anda...'
    
    // Create role-specific profile
    if (pendingRole === 'owner') {
      // Create owner record
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .upsert({
          user_id: user.id,
          owner_type: pendingOwnerType,
          business_name: userName + "'s Business"
        }, { onConflict: 'user_id' })
        .select('id')
        .single()
      
      if (ownerData && !ownerError) {
        // AUTO CREATE LES_PLACE for owner (1 owner = 1 les_place)
        await supabase.from('les_places').upsert({
          owner_id: ownerData.id,
          name: userName + "'s Les",
          description: 'Selamat datang di tempat les kami!',
          type: 'offline',
          address: 'Alamat belum diisi',
          is_verified: false,
          is_active: true,
          photos: [],
          facilities: [],
          total_students: 0,
          rating: 0,
          total_reviews: 0
        }, { onConflict: 'owner_id' })
        
        // If pribadi owner, also create teacher record
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
      // Create teacher record with linked les_place and owner
      const teacherData = {
        user_id: user.id,
        is_available: true
      }
      
      // If we have invite code data, link teacher to les_place and owner
      if (pendingLesPlaceId) {
        teacherData.les_place_id = pendingLesPlaceId
      }
      if (pendingOwnerId) {
        teacherData.owner_id = pendingOwnerId
      }
      
      await supabase.from('teachers').upsert(teacherData, { onConflict: 'user_id' })
      
      // Mark invite code as used
      if (pendingInviteCode) {
        const { data: teacherRecord } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (teacherRecord) {
          await supabase.from('teacher_invite_codes')
            .update({
              is_used: true,
              used_by: teacherRecord.id,
              used_at: new Date().toISOString()
            })
            .eq('code', pendingInviteCode)
        }
      }
    }
    
    // Clean up localStorage
    localStorage.removeItem('pendingRole')
    localStorage.removeItem('pendingOwnerType')
    localStorage.removeItem('pendingInviteCode')
    localStorage.removeItem('pendingLesPlaceId')
    localStorage.removeItem('pendingOwnerId')
    
    // Refresh auth store profile
    await authStore.fetchUserProfile()
    
    status.value = 'Selesai! Mengalihkan...'
    
    // Redirect based on role
    if (pendingRole === 'student') {
      router.push('/')
    } else {
      router.push(`/${pendingRole}/dashboard`)
    }
    
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = 'Terjadi kesalahan. Mengalihkan ke halaman login...'
    setTimeout(() => router.push('/login'), 2000)
  }
})
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
