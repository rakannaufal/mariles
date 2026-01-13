import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useBookings() {
  const bookings = ref([])
  const booking = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Ambil booking untuk siswa saat ini
  async function fetchStudentBookings(studentId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          *,
          programs (
            id,
            name,
            price,
            schedule,
            les_places (
              id,
              name,
              address,
              photos
            )
          ),
          payments (
            id,
            transaction_status,
            paid_at
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (err) throw err
      bookings.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching bookings:', err)
    } finally {
      loading.value = false
    }
  }

  // Ambil booking untuk tempat les pemilik
  async function fetchOwnerBookings(ownerId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          *,
          students (
            id,
            users (name, email, phone, avatar_url)
          ),
          programs (
            id,
            name,
            price,
            les_places!inner (
              id,
              name,
              owner_id
            )
          ),
          payments (
            id,
            transaction_status,
            payment_type
          )
        `)
        .eq('programs.les_places.owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (err) throw err
      bookings.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching owner bookings:', err)
    } finally {
      loading.value = false
    }
  }

  // Buat booking baru
  async function createBooking(data) {
    loading.value = true
    error.value = null

    try {
      const { data: newBooking, error: err } = await supabase
        .from('bookings')
        .insert(data)
        .select()
        .single()

      if (err) throw err
      return newBooking
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update status booking
  async function updateBookingStatus(id, status) {
    loading.value = true
    error.value = null

    try {
      const updateData = { status }
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString()
      }

      const { data: updated, error: err } = await supabase
        .from('bookings')
        .update(updateData)
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

  // Batalkan booking
  async function cancelBooking(id) {
    return updateBookingStatus(id, 'cancelled')
  }

  // Dapatkan statistik booking untuk siswa
  async function getStudentStats(studentId) {
    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select('status')
        .eq('student_id', studentId)

      if (err) throw err

      const stats = {
        total: data?.length || 0,
        active: data?.filter(b => b.status === 'active').length || 0,
        pending: data?.filter(b => b.status === 'pending').length || 0,
        completed: data?.filter(b => b.status === 'completed').length || 0
      }

      return stats
    } catch (err) {
      console.error('Error getting stats:', err)
      return { total: 0, active: 0, pending: 0, completed: 0 }
    }
  }

  return {
    bookings,
    booking,
    loading,
    error,
    fetchStudentBookings,
    fetchOwnerBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    getStudentStats
  }
}
