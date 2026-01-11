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
    // Get pending role and owner type from localStorage
    const pendingRole = localStorage.getItem('pendingRole')
    const pendingOwnerType = localStorage.getItem('pendingOwnerType') || 'umum'
    // For teachers - get invite code data
    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    
    // Determine if this is a registration (has pendingRole) or login attempt (no pendingRole)
    const isRegistrationAttempt = !!pendingRole
    
    // 1. Check if user already exists in DB
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single()
      
    let roleToUse = pendingRole || 'student'
    let isNewUser = false
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]

    if (existingUser) {
      // EXISTING USER: Use their actual role from DB (which should be correct now thanks to Trigger + Metadata)
      console.log('User found in DB, using existing role:', existingUser.role)
      roleToUse = existingUser.role
      
      // If this is a registration attempt, we MUST ensure profile data (like les_places) is created
      // The trigger creates public.users and simple role entries, but misses complex data like les_places
      
      // If roles match, treat as login unless we suspect incomplete profile
      if (isRegistrationAttempt && pendingRole === existingUser.role) {
         status.value = `Selamat datang kembali, ${existingUser.name || userName}!`
      } else if (isRegistrationAttempt && pendingRole !== existingUser.role) {
        // Role mismatch on registration = Role Upgrade/Check
        console.log(`User intent to change role from ${existingUser.role} to ${pendingRole}`)
        
        status.value = `Mengupdate profil ke ${getRoleLabel(pendingRole)}...`
        
        // Call RPC to upgrade role
        const { data: upgradeResult, error: upgradeError } = await supabase.rpc('upgrade_user_role', {
          target_user_id: user.id,
          new_role: pendingRole,
          new_owner_type: pendingOwnerType
        })
        
        if (upgradeError) {
          console.error('Failed to upgrade role:', upgradeError)
          // Fallback to existing role if upgrade fails
          roleToUse = existingUser.role 
          error.value = 'Gagal memperbarui role akun. Masuk sebagai role lama.'
        } else {
           console.log('Role upgrade success:', upgradeResult)
           roleToUse = pendingRole
           isNewUser = true // Treat as new to ensure extra profile setup if needed
        }
      } else {
        // Standard login
        status.value = `Selamat datang kembali, ${existingUser.name || userName}!`
      }
    } else {
      // NEW USER (Not found in public.users yet - possibly trigger lag, or truly new)
      
      // ... (Login attempt check omitted for brevity, logic remains same)
      if (!isRegistrationAttempt) {
         // ... (Login attempt w/o account logic)
         console.log('Login attempt with unregistered Google account')
         error.value = 'Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.'
         await supabase.auth.signOut()
         localStorage.removeItem('pendingRole')
         // ... clear others
         setTimeout(() => router.push('/register'), 3000)
         return
      }
      
      isNewUser = true
      console.log('New user detected, registering as:', pendingRole)
      status.value = 'Membuat profil pengguna baru...'
      
      // Initial user upsert (Redundant if trigger ran, but safe)
      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        name: userName,
        role: pendingRole
      }, { onConflict: 'id' })
      if (upsertError) throw upsertError
    }

    // --- PROFILE CREATION / ENSURANCE LOGIC ---
    // Runs if isNewUser (which is true for actual new users OR registration attempts on existing users)
    if (isNewUser) {
       // Create/Ensure role-specific records
      if (pendingRole === 'owner') {
        // Create owner record
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
          // AUTO CREATE LES_PLACE for owner
          await supabase.from('les_places').upsert({
            owner_id: ownerData.id,
            name: userName + "'s Les",
            description: 'Selamat datang di tempat les kami!',
            type: 'offline',
            address: 'Alamat belum diisi',
            is_verified: false,
            is_active: true,
            // ... (defaults)
            total_students: 0,
            rating: 0,
            total_reviews: 0
          }, { onConflict: 'owner_id' }) // Only insert if not exists (or update)
          
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
        const teacherData = { user_id: user.id, is_available: true }
        if (pendingLesPlaceId) teacherData.les_place_id = pendingLesPlaceId
        if (pendingOwnerId) teacherData.owner_id = pendingOwnerId
        
        await supabase.from('teachers').upsert(teacherData, { onConflict: 'user_id' })
        
        if (pendingInviteCode) {
           // We can call RPC or trust that it's handled
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
    
    // Redirect based on FINAL role
    const targetPath = roleToUse === 'student' ? '/' : `/${roleToUse}/dashboard`
    console.log('Redirecting to:', targetPath)
    
    // Use hard redirect to ensure clean state and avoid router stuck issues
    window.location.href = targetPath
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = 'Terjadi kesalahan saat memproses data akun.'
    setTimeout(() => router.push('/login'), 3000)
  }
}

onMounted(async () => {
  status.value = 'Memvalidasi sesi login...'
  
  // 1. Check direct session first
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (session?.user) {
    await handleLoginSuccess(session.user)
    return
  }

  // 2. If no direct session, listen for auth state change (Hash processing)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await handleLoginSuccess(session.user)
    } else if (event === 'SIGNED_OUT') {
      // Optional: Handle sign out if needed, but primarily we wait for SIGNED_IN
      // Don't error immediately, wait a bit
    }
  })

  // 3. Fallback timeout if nothing happens
  setTimeout(() => {
    if (status.value === 'Memvalidasi sesi login...') {
      error.value = 'Gagal memvalidasi login Google. Waktu habis.'
      setTimeout(() => router.push('/login'), 3000)
    }
  }, 10000) // 10 seconds timeout
})
// Helper to get role label
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
