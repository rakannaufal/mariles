import { supabase } from '@/lib/supabase'

/**
 * Dapatkan saldo yang tersedia untuk penarikan (total saldo - saldo terkunci)
 * @param {string} userId - ID Pengguna
 * @param {string} lesPlaceId - ID Tempat Les
 * @returns {Promise<number>} Jumlah saldo tersedia
 */
export async function getAvailableBalance(userId, lesPlaceId) {
  try {
    // Dapatkan total saldo
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('user_id', userId)
      .eq('les_place_id', lesPlaceId)
      .single()
    
    if (balanceError || !balance) {
      console.error('Error fetching balance:', balanceError)
      return 0
    }
    
    const totalBalance = balance.available_balance || 0
    
    // Dapatkan jumlah terkunci dari transaksi yang masih dalam periode hold
    const { data: lockedTxns, error: lockError } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('les_place_id', lesPlaceId)
      .eq('lock_status', 'active')
      .gt('hold_until', new Date().toISOString())
      .in('payment_status', ['settlement', 'paid', 'completed'])
    
    if (lockError) {
      console.error('Error fetching locked transactions:', lockError)
      return totalBalance // Kembalikan total jika tidak bisa mendapatkan yang terkunci
    }
    
    const lockedAmount = lockedTxns?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0
    
    return Math.max(0, totalBalance - lockedAmount)
  } catch (error) {
    console.error('Error in getAvailableBalance:', error)
    return 0
  }
}

/**
 * Dapatkan detail saldo terkunci
 * @param {string} userId - ID Pengguna  
 * @param {string} lesPlaceId - ID Tempat Les
 * @returns {Promise<Array>} Array transaksi terkunci
 */
export async function getLockedBalance(userId, lesPlaceId) {
  try {
    const { data: locks, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        net_amount,
        hold_until,
        created_at,
        programs (
          id,
          name
        )
      `)
      .eq('les_place_id', lesPlaceId)
      .eq('lock_status', 'active')
      .gt('hold_until', new Date().toISOString())
      .in('payment_status', ['settlement', 'paid', 'completed'])
      .order('hold_until', { ascending: true })
    
    if (error) {
      console.error('Error fetching locked balance:', error)
      return []
    }
    
    return locks || []
  } catch (error) {
    console.error('Error in getLockedBalance:', error)
    return []
  }
}

/**
 * Hitung hari hingga tanggal tertentu
 * @param {string} dateString - String tanggal ISO
 * @returns {number} Sisa hari (dibulatkan ke atas)
 */
export function daysUntil(dateString) {
  if (!dateString) return 0
  const target = new Date(dateString)
  const now = new Date()
  const diffTime = target - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Cek apakah transaksi masih dalam periode hold
 * @param {string} hold_until - Timestamp hold sampai
 * @returns {boolean} Benar jika masih dalam periode hold
 */
export function isInHoldPeriod(hold_until) {
  if (!hold_until) return false
  return new Date() < new Date(hold_until)
}

/**
 * Cek apakah transaksi masih dalam jendela pengembalian dana
 * @param {string} refund_deadline - Timestamp batas waktu pengembalian
 * @param {string} created_at - Timestamp pembuatan transaksi (fallback jika refund_deadline null)
 * @returns {boolean} Benar jika masih dalam jendela
 */
export function isWithinRefundWindow(refund_deadline, created_at = null) {
  // Jika refund_deadline ada, gunakan itu
  if (refund_deadline) {
    return new Date() < new Date(refund_deadline)
  }
  
  // Fallback: Hitung dari created_at + 90 hari
  if (created_at) {
    const deadline = new Date(created_at)
    deadline.setDate(deadline.getDate() + 90)
    return new Date() < deadline
  }
  
  return false
}
