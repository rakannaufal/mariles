import { supabase } from '@/lib/supabase'

/**
 * Get available balance for withdrawal (total balance - locked balance)
 * @param {string} userId - User ID
 * @param {string} lesPlaceId - Les Place ID
 * @returns {Promise<number>} Available balance amount
 */
export async function getAvailableBalance(userId, lesPlaceId) {
  try {
    // Get total balance
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
    
    // Get locked amount from transactions still in hold period
    const { data: lockedTxns, error: lockError } = await supabase
      .from('transactions')
      .select('net_amount')
      .eq('les_place_id', lesPlaceId)
      .eq('lock_status', 'active')
      .gt('hold_until', new Date().toISOString())
      .in('payment_status', ['settlement', 'paid', 'completed'])
    
    if (lockError) {
      console.error('Error fetching locked transactions:', lockError)
      return totalBalance // Return total if can't get locked
    }
    
    const lockedAmount = lockedTxns?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0
    
    return Math.max(0, totalBalance - lockedAmount)
  } catch (error) {
    console.error('Error in getAvailableBalance:', error)
    return 0
  }
}

/**
 * Get locked balance details
 * @param {string} userId - User ID  
 * @param {string} lesPlaceId - Les Place ID
 * @returns {Promise<Array>} Array of locked transactions
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
 * Calculate days until a date
 * @param {string} dateString - ISO date string
 * @returns {number} Days remaining (rounded up)
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
 * Check if transaction is still in hold period
 * @param {string} hold_until - Hold until timestamp
 * @returns {boolean} True if still in hold period
 */
export function isInHoldPeriod(hold_until) {
  if (!hold_until) return false
  return new Date() < new Date(hold_until)
}

/**
 * Check if transaction is within refund window
 * @param {string} refund_deadline - Refund deadline timestamp
 * @param {string} created_at - Transaction creation timestamp (fallback if refund_deadline is null)
 * @returns {boolean} True if still within window
 */
export function isWithinRefundWindow(refund_deadline, created_at = null) {
  // If refund_deadline exists, use it
  if (refund_deadline) {
    return new Date() < new Date(refund_deadline)
  }
  
  // Fallback: Calculate from created_at + 90 days
  if (created_at) {
    const deadline = new Date(created_at)
    deadline.setDate(deadline.getDate() + 90)
    return new Date() < deadline
  }
  
  return false
}
