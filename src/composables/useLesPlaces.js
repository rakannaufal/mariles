import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { getDummyLesPlaces, getDummyLesPlaceById, searchDummyLesPlaces } from '@/dummy'
import { loadDummyDataSetting, getUseDummyData } from '@/dummy/config'

export function useLesPlaces() {
  const lesPlaces = ref([])
  const lesPlace = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch all les places with optional filters
  async function fetchLesPlaces(filters = {}) {
    loading.value = true
    error.value = null

    try {
      // Load dummy data setting from Supabase (async)
      const useDummy = await loadDummyDataSetting()
      
      if (useDummy) {
        const dummyData = searchDummyLesPlaces(filters)
        lesPlaces.value = dummyData
        loading.value = false
        return
      }

      let query = supabase
        .from('les_places')
        .select(`
          *,
          owners (
            id,
            business_name,
            users (name, avatar_url)
          ),
          programs (
            id,
            name,
            price,
            price_type,
            level,
            is_active,
            current_students,
            capacity
          ),
          reviews (
            id,
            rating
          ),
          bookings!bookings_les_place_id_fkey (
            id,
            program_id,
            status,
            payment_status
          )
        `)
        .eq('is_active', true)
        .eq('verification_status', 'verified')
// ... (rest of query building omitted for brevity, ensure context is preserved)
// Resume after query building

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.city) {
        query = query.eq('city', filters.city)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.category) {
        query = query.contains('facilities', [filters.category])
      }

      // Sorting
      if (filters.sortBy === 'rating') {
        query = query.order('rating', { ascending: false })
      } else if (filters.sortBy === 'price_low') {
        query = query.order('id', { ascending: true })
      } else {
        query = query.order('total_students', { ascending: false })
      }

      // Limit
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error: err } = await query

      if (err) throw err
      lesPlaces.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching les places:', err)
    } finally {
      loading.value = false
    }
  }

  // Fetch featured les places (top rated)
  async function fetchFeaturedLesPlaces(limit = 4) {
    return fetchLesPlaces({ sortBy: 'rating', limit })
  }

  // Fetch single les place by ID
  async function fetchLesPlaceById(id) {
    loading.value = true
    error.value = null

    try {
      // Load dummy data setting from Supabase (async)
      const useDummy = await loadDummyDataSetting()
      
      if (useDummy) {
        const dummyData = getDummyLesPlaceById(id)
        lesPlace.value = dummyData
        loading.value = false
        return
      }
// ... (rest of function)

      const { data, error: err } = await supabase
        .from('les_places')
        .select(`
          *,
          owners (
            id,
            business_name,
            verification_status,
            users (name, avatar_url, phone)
          ),
          programs (
            id,
            name,
            description,
            subject,
            price,
            price_type,
            duration_months,
            sessions_per_week,
            session_duration_minutes,
            schedule,
            capacity,
            current_students,
            level,
            is_active,
            categories (name)
          ),
          reviews (
            id,
            rating,
            comment,
            reply,
            replied_at,
            created_at,
            booking_id,
            bookings (
              programs (id, name)
            ),
            students (
              users (name, avatar_url)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (err) throw err
      lesPlace.value = data

      // Fetch teachers separately to avoid RLS issues
      try {
        const { data: teachersData, error: teacherError } = await supabase
          .from('teachers')
          .select(`
            id,
            experience_years,
            education,
            specialization,
            specializations,
            bio,
            users (name, avatar_url)
          `)
          .eq('les_place_id', id)
          .eq('is_active', true) // Only show active teachers

        if (teachersData && lesPlace.value) {
          lesPlace.value.teachers = teachersData
        }
      } catch (teacherErr) {
        console.error('Could not fetch teachers:', teacherErr)
        // Continue without teachers data - not critical
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching les place:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new les place (for owners)
  async function createLesPlace(data) {
    loading.value = true
    error.value = null

    try {
      const { data: newLes, error: err } = await supabase
        .from('les_places')
        .insert(data)
        .select()
        .single()

      if (err) throw err
      return newLes
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update les place
  async function updateLesPlace(id, data) {
    loading.value = true
    error.value = null

    try {
      const { data: updated, error: err } = await supabase
        .from('les_places')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return updated
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete les place
  async function deleteLesPlace(id) {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('les_places')
        .delete()
        .eq('id', id)

      if (err) throw err
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    lesPlaces,
    lesPlace,
    loading,
    error,
    fetchLesPlaces,
    fetchFeaturedLesPlaces,
    fetchLesPlaceById,
    createLesPlace,
    updateLesPlace,
    deleteLesPlace
  }
}
