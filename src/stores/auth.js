import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  // Ambil role dari userProfile, atau dari user_metadata jika profile belum terload
  const userRole = computed(() => 
    userProfile.value?.role || 
    user.value?.user_metadata?.role || 
    'student' // Fallback ke student jika tidak ada role ditemukan
  )

  async function initialize() {
    loading.value = true
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      user.value = authUser
      await fetchUserProfile()
    }
    
    loading.value = false

    // Dengarkan perubahan auth
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user || null
      if (session?.user) {
        // Tunggu sebentar untuk trigger selesai, lalu ambil profil
        setTimeout(async () => {
          await fetchUserProfile()
        }, 500)
      } else {
        userProfile.value = null
      }
    })
  }

  async function fetchUserProfile() {
    if (!user.value) return

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (!error && data) {
      userProfile.value = data
    } else {
      // Jika profil tidak ada, buat satu (untuk pengguna Google OAuth)
      await createUserProfile()
    }
  }

  async function createUserProfile() {
    if (!user.value) return

    // Cek role dan data terkait dari localStorage (untuk Google OAuth signup)
    const pendingRole = localStorage.getItem('pendingRole')
    const pendingOwnerType = localStorage.getItem('pendingOwnerType')
    const pendingInviteCode = localStorage.getItem('pendingInviteCode')
    const pendingLesPlaceId = localStorage.getItem('pendingLesPlaceId')
    const pendingOwnerId = localStorage.getItem('pendingOwnerId')
    
    // Hapus semua pending data dari localStorage setelah digunakan
    if (pendingRole) localStorage.removeItem('pendingRole')
    if (pendingOwnerType) localStorage.removeItem('pendingOwnerType')
    if (pendingInviteCode) localStorage.removeItem('pendingInviteCode')
    if (pendingLesPlaceId) localStorage.removeItem('pendingLesPlaceId')
    if (pendingOwnerId) localStorage.removeItem('pendingOwnerId')

    // Cek apakah pengguna sudah ada dan dapatkan role saat ini
    const { data: existingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.value.id)
      .single()
    
    // Prioritas: pendingRole > role non-student yang ada > role user_metadata > 'student'
    const finalRole = pendingRole || 
      (existingUser?.role && existingUser.role !== 'student' ? existingUser.role : null) || 
      user.value.user_metadata?.role || 
      'student'

    const userName = user.value.user_metadata?.name || 
      user.value.user_metadata?.full_name || 
      user.value.email?.split('@')[0]

    const { error } = await supabase.from('users').upsert({
      id: user.value.id,
      email: user.value.email,
      name: userName,
      role: finalRole
    }, { 
      onConflict: 'id',
      ignoreDuplicates: false  // Pastikan update terjadi
    })

    // Buat profil role-spesifik jika diperlukan
    if (!error) {
      if (finalRole === 'student') {
        await supabase.from('students').upsert({
          user_id: user.value.id
        }, { onConflict: 'user_id' })
      } else if (finalRole === 'owner') {
        await supabase.from('owners').upsert({
          user_id: user.value.id,
          business_name: userName + "'s Business",
          owner_type: pendingOwnerType || 'umum'
        }, { onConflict: 'user_id' })
      } else if (finalRole === 'teacher') {
        // Buat catatan guru dengan owner_id dan les_place_id dari kode undangan
        const { data: teacherData } = await supabase.from('teachers').upsert({
          user_id: user.value.id,
          owner_id: pendingOwnerId || null,
          les_place_id: pendingLesPlaceId || null
        }, { onConflict: 'user_id' }).select().single()

        // Tandai kode undangan sebagai terpakai jika disediakan
        if (pendingInviteCode && teacherData) {
          await supabase.rpc('use_teacher_invite_code', {
            p_code: pendingInviteCode,
            p_teacher_id: teacherData.id
          })
        }
      }
      
      await fetchUserProfile()
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error

    // Segera update state untuk menghindari race condition
    if (data.user) {
      user.value = data.user
      await fetchUserProfile()
    }
    
    return data
  }

  async function signUp(email, password, profileData) {
    // profileData includes: name, role, phone, gender, birth_date, address, owner_type, les_place_* fields
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name: profileData.name, 
          role: profileData.role || 'student',
          phone: profileData.phone,
          gender: profileData.gender,
          birth_date: profileData.birth_date,
          address: profileData.address,
          owner_type: profileData.owner_type || null
        }
      }
    })
    
    if (error) throw error

    // Jika user langsung ter-confirm, simpan ke database
    if (data.user && data.session) {
      // Buat catatan pengguna
      await supabase.from('users').upsert({
        id: data.user.id,
        email: email,
        name: profileData.name,
        role: profileData.role || 'student',
        phone: profileData.phone || null,
        gender: profileData.gender || null,
        birth_date: profileData.birth_date || null,
        address: profileData.address || null
      }, { onConflict: 'id' })

      // Untuk owner, buat catatan owner dengan owner_type dan les_place
      if (profileData.role === 'owner') {
        // Buat catatan owner
        const { data: ownerData } = await supabase.from('owners').upsert({
          user_id: data.user.id,
          business_name: profileData.les_place_name || profileData.name + "'s Business",
          owner_type: profileData.owner_type || 'umum'
        }, { onConflict: 'user_id' }).select().single()

        // Buat les_place jika ada infonya
        if (ownerData && profileData.les_place_name) {
          await supabase.from('les_places').insert({
            owner_id: ownerData.id,
            name: profileData.les_place_name,
            description: profileData.les_place_description || null,
            type: profileData.les_place_type || 'offline',
            address: profileData.les_place_address || null,
            city: profileData.city_name || null,
            province: profileData.province_name || null,
            is_private: profileData.owner_type === 'pribadi'
          })
        }
      }

      // Untuk guru, buat catatan guru dengan linking kode undangan
      if (profileData.role === 'teacher') {
        // Buat catatan guru dengan owner_id dan les_place_id dari kode undangan
        const { data: teacherData } = await supabase.from('teachers').upsert({
          user_id: data.user.id,
          owner_id: profileData.owner_id || null,
          les_place_id: profileData.les_place_id || null
        }, { onConflict: 'user_id' }).select().single()

        // Tandai kode undangan sebagai terpakai jika disediakan
        if (profileData.invite_code && teacherData) {
          await supabase.rpc('use_teacher_invite_code', {
            p_code: profileData.invite_code,
            p_teacher_id: teacherData.id
          })
        }
      }

      // Untuk siswa, buat catatan siswa
      if (profileData.role === 'student') {
        await supabase.from('students').upsert({
          user_id: data.user.id,
          nickname: profileData.nickname || null,
          gender: profileData.gender || null,
          date_of_birth: profileData.birth_date || null,
          education_level: profileData.education_level || null,
          grade: profileData.grade || null,
          school_name: profileData.school_name || null,
          parent_name: profileData.parent_name || null,
          parent_phone: profileData.parent_phone || null,
          province_id: profileData.province_id || null,
          province_name: profileData.province_name || null,
          city_id: profileData.city_id || null,
          city_name: profileData.city_name || null
        }, { onConflict: 'user_id' })
      }
    }
    
    return data
  }

  async function signInWithGoogle() {
    // Dapatkan pending role dan owner type dari localStorage (diset saat registrasi)
    const pendingRole = localStorage.getItem('pendingRole') || 'student'
    const pendingOwnerType = localStorage.getItem('pendingOwnerType') || null
    
    // Konstruksi metadata untuk dikirim ke Supabase
    // Ini memastikan trigger handle_new_user mendapat role yang benar segera
    const metaData = {
      role: pendingRole,
      owner_type: pendingOwnerType
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        data: metaData 
      }
    })
    
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    userProfile.value = null
  }

  return {
    user,
    userProfile,
    loading,
    isAuthenticated,
    userRole,
    initialize,
    fetchUserProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  }
})

