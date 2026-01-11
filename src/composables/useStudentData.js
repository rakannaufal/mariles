// Composable untuk mengelola data student
// Uses real Supabase data only

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useStudentData() {
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const studentId = ref(null)
  const student = ref(null)
  const bookings = ref([])
  const favorites = ref([])
  const paymentHistory = ref([])
  const stats = ref({ active_classes: 0, pending_bookings: 0, completed_classes: 0, favorites_count: 0 })
  
  // Fetch student ID
  async function fetchStudentId() {
    if (!authStore.user) return null
    
    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (data) {
      studentId.value = data.id
    }
    return data?.id
  }
  
  // Fetch student profile
  async function fetchStudent() {
    if (!authStore.user) return null
    
    const { data } = await supabase
      .from('students')
      .select('*, users(*)')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (data) {
      student.value = { ...data, ...data.users }
    }
    return student.value
  }
  
  // Fetch bookings (excludes refunded bookings - those should not appear in active list)
  async function fetchBookings() {
    loading.value = true
    try {
      const sid = studentId.value || await fetchStudentId()
      if (!sid) return []
      
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          programs (
            id, name, subject, price, les_place_id,
            les_places (id, name, photos, city, address)
          ),
          payments (id, transaction_status, gross_amount, created_at),
          transactions (id, amount, payment_status, created_at)
        `)
        .eq('student_id', sid)
        // .neq('status', 'refunded') // REMOVED: Include refunded to show them correctly in list
        .order('created_at', { ascending: false })
      
      // Fetch approved refunds for defensive check
      const { data: approvedRefunds } = await supabase
        .from('refunds')
        .select('transaction_id, transactions(booking_id, program_id)')
        .eq('student_id', authStore.user?.id) 
        .eq('status', 'approved')

      const refundedBookingIds = new Set()
      const refundedProgramIds = new Set()
      
      if (approvedRefunds) {
        approvedRefunds.forEach(r => {
          if (r.transactions?.booking_id) refundedBookingIds.add(r.transactions.booking_id)
          if (r.transactions?.program_id) refundedProgramIds.add(r.transactions.program_id)
        })
      }

      if (data) {
        bookings.value = data.map(b => {
          const latestTx = b.transactions?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))?.[0]
          const actualAmount = latestTx?.amount || null
          
          // FORCE OVERRIDE STATUS IF REFUNDED
          let finalStatus = b.status
          let finalPaymentStatus = b.payment_status
          const isRefunded = refundedBookingIds.has(b.id) || (b.programs?.id && refundedProgramIds.has(b.programs.id))
          
          if (isRefunded) {
             finalStatus = 'refunded'
             finalPaymentStatus = 'refunded'
          }

          return {
            ...b,
            status: finalStatus, // Use override status
            payment_status: finalPaymentStatus,
            program: {
              ...b.programs,
              les_place: b.programs?.les_places
            },
            payment: b.payments?.[0] ? {
              status: b.payments[0].transaction_status,
              amount: b.payments[0].gross_amount,
              paid_at: b.payments[0].created_at
            } : { status: 'pending', amount: b.programs?.price, paid_at: null },
            actualAmount: actualAmount,
            hasDiscount: actualAmount && actualAmount < (b.programs?.price || 0) + 5000
          }
        })
      }
    } finally {
      loading.value = false
    }
    return bookings.value
  }
  
  // Fetch favorites
  async function fetchFavorites() {
    if (!authStore.user) return []
    
    const { data } = await supabase
      .from('favorites')
      .select(`
        *,
        les_places (id, name, photos, city, rating, total_students)
      `)
      .eq('user_id', authStore.user.id)
    
    if (data) {
      favorites.value = data.map(f => ({
        ...f,
        les_place: f.les_places
      }))
    }
    return favorites.value
  }
  
  // Fetch payment history
  async function fetchPaymentHistory() {
    const sid = studentId.value || await fetchStudentId()
    if (!sid) return []
    
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          programs (name, les_places (name))
        )
      `)
      .eq('bookings.student_id', sid)
      .order('created_at', { ascending: false })
    
    if (data) {
      paymentHistory.value = data.map(p => ({
        ...p,
        program_name: p.bookings?.programs?.name,
        les_place_name: p.bookings?.programs?.les_places?.name
      }))
    }
    return paymentHistory.value
  }
  
  // Remove favorite
  async function removeFavorite(id) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id)
    
    if (!error) {
      favorites.value = favorites.value.filter(f => f.id !== id)
    }
    return !error
  }
  
  // Fetch stats
  async function fetchStats() {
    const sid = studentId.value || await fetchStudentId()
    if (!sid) return stats.value
    
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('status')
      .eq('student_id', sid)
    
    const { data: favData } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', authStore.user?.id)
    
    if (bookingsData) {
      stats.value = {
        active_classes: bookingsData.filter(b => b.status === 'active' || b.status === 'confirmed').length,
        pending_bookings: bookingsData.filter(b => b.status === 'pending').length,
        completed_classes: bookingsData.filter(b => b.status === 'completed').length,
        refunded_classes: bookingsData.filter(b => b.status === 'refunded').length,
        total_bookings: bookingsData.filter(b => b.status !== 'refunded').length, // Exclude refunded from total
        favorites_count: favData?.length || 0
      }
    }
    return stats.value
  }
  
  // Cancel booking
  async function cancelBooking(bookingId, reason = 'cancelled') {
    try {
      const { data, error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          payment_status: 'failed'
        })
        .eq('id', bookingId)
        .select()
      
      if (bookingError) {
        console.error('Cancel booking error:', bookingError)
        return false
      }
      
      await supabase
        .from('transactions')
        .update({ payment_status: reason === 'expired' ? 'expire' : 'cancelled' })
        .eq('booking_id', bookingId)
      
      const booking = bookings.value.find(b => b.id === bookingId)
      if (booking) {
        booking.status = 'cancelled'
        booking.payment_status = 'failed'
      }
      
      return true
    } catch (err) {
      console.error('Error:', err)
      return false
    }
  }
  
  // Get all data
  async function fetchAllData() {
    loading.value = true
    try {
      await fetchStudentId()
      await Promise.all([
        fetchStudent(),
        fetchBookings(),
        fetchFavorites(),
        fetchPaymentHistory(),
        fetchStats()
      ])
    } finally {
      loading.value = false
    }
  }
  
  return {
    loading,
    studentId,
    student,
    bookings,
    favorites,
    paymentHistory,
    stats,
    fetchStudentId,
    fetchStudent,
    fetchBookings,
    fetchFavorites,
    fetchPaymentHistory,
    removeFavorite,
    fetchStats,
    cancelBooking,
    fetchAllData
  }
}
