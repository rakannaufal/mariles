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
    'student' // Fallback to student if no role found
  )

  async function initialize() {
    loading.value = true
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      user.value = authUser
      await fetchUserProfile()
    }
    
    loading.value = false

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user || null
      if (session?.user) {
        // Wait a bit for trigger to complete, then fetch profile
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
      // If no profile exists, create one (for Google OAuth users)
      await createUserProfile()
    }
  }

  async function createUserProfile() {
    if (!user.value) return

    // Cek role dari localStorage (untuk Google OAuth signup)
    const pendingRole = localStorage.getItem('pendingRole')
    
    // Hapus pendingRole dari localStorage setelah digunakan
    if (pendingRole) {
      localStorage.removeItem('pendingRole')
    }

    // Check if user already exists and get current role
    const { data: existingUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.value.id)
      .single()
    
    // Priority: pendingRole > existing non-student role > user_metadata role > 'student'
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
      ignoreDuplicates: false  // Ensure update happens
    })

    // Create role-specific profile if needed
    if (!error) {
      if (finalRole === 'student') {
        await supabase.from('students').upsert({
          user_id: user.value.id
        }, { onConflict: 'user_id' })
      } else if (finalRole === 'owner') {
        await supabase.from('owners').upsert({
          user_id: user.value.id,
          business_name: userName + "'s Business"
        }, { onConflict: 'user_id' })
      } else if (finalRole === 'teacher') {
        await supabase.from('teachers').upsert({
          user_id: user.value.id
        }, { onConflict: 'user_id' })
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

    // Immediately update state to avoid race conditions
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
      // Create user record
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

      // For owners, create owner record with owner_type and les_place
      if (profileData.role === 'owner') {
        // Create owner record
        const { data: ownerData } = await supabase.from('owners').upsert({
          user_id: data.user.id,
          business_name: profileData.les_place_name || profileData.name + "'s Business",
          owner_type: profileData.owner_type || 'umum'
        }, { onConflict: 'user_id' }).select().single()

        // Create les_place if we have the info
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

      // For teachers, create teacher record with invite code linking
      if (profileData.role === 'teacher') {
        // Create teacher record with owner_id and les_place_id from invite code
        const { data: teacherData } = await supabase.from('teachers').upsert({
          user_id: data.user.id,
          owner_id: profileData.owner_id || null,
          les_place_id: profileData.les_place_id || null
        }, { onConflict: 'user_id' }).select().single()

        // Mark invite code as used if provided
        if (profileData.invite_code && teacherData) {
          await supabase.rpc('use_teacher_invite_code', {
            p_code: profileData.invite_code,
            p_teacher_id: teacherData.id
          })
        }
      }

      // For students, create student record
      if (profileData.role === 'student') {
        await supabase.from('students').upsert({
          user_id: data.user.id,
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
    // Get pending role and owner type from localStorage (set during registration)
    const pendingRole = localStorage.getItem('pendingRole') || 'student'
    const pendingOwnerType = localStorage.getItem('pendingOwnerType') || null
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
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

