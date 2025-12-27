/**
 * Payment Service
 * ===============
 * 
 * Handles all payment operations:
 * - Creating payments (Student → Owner)
 * - Processing withdrawals (Owner/Teacher → Bank)
 * - Payment status updates
 * 
 * Uses Midtrans for payment gateway integration.
 */

import { supabase } from '@/lib/supabase'
import MIDTRANS_CONFIG, { generateOrderId, openSnapPayment } from '@/lib/midtrans'

// ============================================================
// PAYMENT CREATION (Student pays for class/program)
// ============================================================

/**
 * Create a payment transaction for student booking
 * @param {Object} params - Payment parameters
 * @param {string} params.lesPlaceId - Les place ID
 * @param {string} params.studentId - Student user ID
 * @param {string} params.bookingId - Booking ID (optional)
 * @param {string} params.programId - Program ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.description - Payment description
 * @param {Object} params.customerDetails - Customer info for Midtrans
 */
export async function createPayment({
  lesPlaceId,
  studentId,
  bookingId = null,
  programId,
  amount,
  description = 'Pembayaran Kelas',
  customerDetails = {},
  preferredPayment = null
}) {
  try {
    const orderId = generateOrderId('TXN')
    
    // Handle free payment (e.g. 100% discount or free course)
    if (amount <= 0) {
      const { data: transaction, error: dbError } = await supabase
        .from('transactions')
        .insert({
          les_place_id: lesPlaceId,
          student_id: studentId,
          booking_id: bookingId,
          program_id: programId,
          amount: 0,
          platform_fee: 0,
          net_amount: 0,
          payment_status: 'completed', // Instantly completed
          midtrans_order_id: orderId,
          description: description,
          payment_date: new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) throw dbError

      return {
        success: true,
        transaction: transaction,
        orderId: orderId,
        isFree: true // Flag to indicate free payment
      }
    }

    const platformFee = Math.round(amount * 0.05) // 5% platform fee
    const netAmount = amount - platformFee

    // ============================================================
    // REAL MODE - Use Supabase Edge Function
    // ============================================================

    // 1. Create transaction record in database
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        les_place_id: lesPlaceId,
        student_id: studentId,
        booking_id: bookingId,
        program_id: programId,
        amount: amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        payment_status: 'pending',
        midtrans_order_id: orderId,
        description: description
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 2. Call Supabase Edge Function to create Snap Token
    const { data: snapData, error: funcError } = await supabase.functions.invoke('create-snap-token', {
      body: {
        orderId,
        amount,
        customerDetails,
        preferredPayment, // Pass the selected payment method
        itemDetails: [{
          id: programId || 'program-1',
          price: amount,
          quantity: 1,
          name: description
        }]
      }
    })

    if (funcError) {
      console.error('Edge Function error:', funcError)
      throw new Error(funcError.message || 'Gagal membuat snap token')
    }

    if (!snapData?.success) {
      throw new Error(snapData?.error || 'Gagal membuat snap token')
    }

    // 3. Update transaction with snap token
    await supabase
      .from('transactions')
      .update({
        snap_token: snapData.token,
        snap_redirect_url: snapData.redirect_url
      })
      .eq('id', transaction.id)

    return {
      success: true,
      transaction: transaction,
      snapToken: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId: orderId
    }

  } catch (error) {
    console.error('Create payment error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Open Midtrans Snap payment popup
 * @param {string} snapToken - Snap token from createPayment
 * @param {Function} onSuccess - Success callback
 * @param {Function} onPending - Pending callback
 * @param {Function} onError - Error callback
 */
export async function payWithSnap(snapToken, { onSuccess, onPending, onError, onClose }) {
  try {
    await openSnapPayment(snapToken, {
      onSuccess: async (result) => {
        // Update transaction status
        await updatePaymentStatus(result.order_id, 'completed', result)
        onSuccess?.(result)
      },
      onPending: async (result) => {
        await updatePaymentStatus(result.order_id, 'pending', result)
        onPending?.(result)
      },
      onError: async (result) => {
        await updatePaymentStatus(result.order_id, 'failed', result)
        onError?.(result)
      },
      onClose: () => {
        onClose?.()
      }
    })
  } catch (error) {
    console.error('Snap payment error:', error)
    onError?.({ error: error.message })
  }
}

/**
 * Update payment status after Midtrans callback
 * @param {string} orderId - Midtrans order ID
 * @param {string} status - New payment status
 * @param {Object} midtransResult - Midtrans response
 */
export async function updatePaymentStatus(orderId, status, midtransResult = {}) {
  try {
    const updateData = {
      payment_status: status,
      midtrans_transaction_id: midtransResult.transaction_id,
      midtrans_payment_type: midtransResult.payment_type,
      midtrans_status_code: midtransResult.status_code,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.payment_date = new Date().toISOString()
    }

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('midtrans_order_id', orderId)

    if (error) throw error

    // If completed, update owner's balance and increment program students
    if (status === 'completed') {
      await updateOwnerBalance(orderId)
      await incrementProgramStudents(orderId)
    }

    return { success: true }
  } catch (error) {
    console.error('Update payment status error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update owner balance after successful payment
 */
async function updateOwnerBalance(orderId) {
  try {
    // Get transaction details
    const { data: txn } = await supabase
      .from('transactions')
      .select('les_place_id, net_amount, les_places(owner_id)')
      .eq('midtrans_order_id', orderId)
      .single()

    if (!txn) return

    const ownerId = txn.les_places?.owner_id
    if (!ownerId) return

    // Update or create balance
    const { data: existingBalance } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', ownerId)
      .single()

    if (existingBalance) {
      await supabase
        .from('balances')
        .update({
          total_balance: existingBalance.total_balance + txn.net_amount,
          available_balance: existingBalance.available_balance + txn.net_amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', ownerId)
    } else {
      await supabase
        .from('balances')
        .insert({
          user_id: ownerId,
          les_place_id: txn.les_place_id,
          total_balance: txn.net_amount,
          available_balance: txn.net_amount,
          pending_balance: 0
        })
    }
  } catch (error) {
    console.error('Update owner balance error:', error)
  }
}

// ============================================================
// WITHDRAWALS (Owner/Teacher → Bank)
// ============================================================

/**
 * Increment program's current_students and les_place's total_students after successful payment
 */
async function incrementProgramStudents(orderId) {
  try {
    // Get transaction with program_id and les_place_id
    const { data: txn } = await supabase
      .from('transactions')
      .select('program_id, les_place_id')
      .eq('midtrans_order_id', orderId)
      .single()

    if (!txn?.program_id) return

    // Increment program's current_students
    const { data: program } = await supabase
      .from('programs')
      .select('current_students')
      .eq('id', txn.program_id)
      .single()

    await supabase
      .from('programs')
      .update({
        current_students: (program?.current_students || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', txn.program_id)

    console.log(`Program ${txn.program_id} student count incremented`)

    // Also increment les_place's total_students
    if (txn.les_place_id) {
      const { data: lesPlace } = await supabase
        .from('les_places')
        .select('total_students')
        .eq('id', txn.les_place_id)
        .single()

      await supabase
        .from('les_places')
        .update({
          total_students: (lesPlace?.total_students || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', txn.les_place_id)

      console.log(`Les place ${txn.les_place_id} total students incremented`)
    }
  } catch (error) {
    console.error('Increment program students error:', error)
  }
}

/**
 * Request a withdrawal
 * @param {Object} params - Withdrawal parameters
 * @param {string} params.userId - User requesting withdrawal
 * @param {string} params.lesPlaceId - Les place ID (for owner)
 * @param {number} params.amount - Withdrawal amount
 * @param {string} params.bankName - Bank name
 * @param {string} params.bankAccount - Bank account number
 * @param {string} params.bankHolder - Account holder name
 */
export async function requestWithdrawal({
  userId,
  lesPlaceId = null,
  amount,
  bankName,
  bankAccount,
  bankHolder
}) {
  try {
    // Validate balance
    const { data: balance } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('user_id', userId)
      .single()

    if (!balance || balance.available_balance < amount) {
      return { success: false, error: 'Saldo tidak mencukupi' }
    }

    // Calculate fee (assume 0.5% fee, min 1000)
    const fee = Math.max(1000, Math.round(amount * 0.005))
    const netAmount = amount - fee

    // Create withdrawal record
    const { data: withdrawal, error: dbError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        les_place_id: lesPlaceId,
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        status: 'pending'
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Deduct from available balance immediately
    await supabase
      .from('balances')
      .update({
        available_balance: balance.available_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // In production, this would trigger Midtrans Iris Disbursement
    // For now, we simulate immediate processing
    // await processWithdrawal(withdrawal.id)

    return {
      success: true,
      withdrawal: withdrawal,
      message: 'Permintaan pencairan berhasil. Dana akan ditransfer dalam 1-3 hari kerja.'
    }

  } catch (error) {
    console.error('Request withdrawal error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Process withdrawal via Midtrans Iris (Disbursement)
 * Calls the Supabase Edge Function which handles the Iris API
 * @param {string} withdrawalId - Withdrawal record ID
 */
export async function processWithdrawal(withdrawalId) {
  try {
    // Check if using dummy mode
    const USE_DUMMY = isDummyEnabled('payment')
    
    if (USE_DUMMY) {
      // Simulate Iris processing
      console.log('DUMMY MODE: Simulating Iris disbursement')
      
      // Update to processing
      await supabase
        .from('withdrawals')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId)
      
      // Simulate delay then complete
      setTimeout(async () => {
        await supabase
          .from('withdrawals')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            iris_reference_key: `IRIS-SIM-${Date.now()}`,
            iris_status: 'completed'
          })
          .eq('id', withdrawalId)
      }, 3000)
      
      return { 
        success: true, 
        message: 'Pencairan sedang diproses (simulasi)',
        reference: `IRIS-SIM-${Date.now()}`
      }
    }
    
    // ============================================================
    // REAL MODE - Call Supabase Edge Function
    // ============================================================
    const { data, error } = await supabase.functions.invoke('process-disbursement', {
      body: {
        withdrawalId,
        action: 'create_payout'
      }
    })
    
    if (error) {
      console.error('Edge Function error:', error)
      throw new Error(error.message || 'Gagal memproses pencairan')
    }
    
    if (!data?.success) {
      throw new Error(data?.error || 'Gagal memproses pencairan')
    }
    
    return {
      success: true,
      message: 'Pencairan berhasil diproses',
      reference: data.reference,
      status: data.status
    }

  } catch (error) {
    console.error('Process withdrawal error:', error)
    
    // Revert status on error
    await supabase
      .from('withdrawals')
      .update({ status: 'failed' })
      .eq('id', withdrawalId)

    return { success: false, error: error.message }
  }
}

/**
 * Check withdrawal status from Midtrans Iris
 * @param {string} withdrawalId - Withdrawal record ID
 */
export async function checkWithdrawalStatus(withdrawalId) {
  try {
    const { data, error } = await supabase.functions.invoke('process-disbursement', {
      body: {
        withdrawalId,
        action: 'check_status'
      }
    })
    
    if (error) throw new Error(error.message)
    
    return {
      success: true,
      status: data?.status,
      irisStatus: data?.iris_status
    }
  } catch (error) {
    console.error('Check withdrawal status error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// TEACHER SALARY PAYMENT
// ============================================================

/**
 * Pay teacher salary from owner's balance
 * @param {Object} params - Payment parameters
 */
export async function payTeacherSalary({
  ownerId,
  lesPlaceId,
  teacherId,
  amount,
  paymentPeriod,
  bankName,
  bankAccount,
  bankHolder
}) {
  try {
    // Check owner's balance
    const { data: balance } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('user_id', ownerId)
      .single()

    if (!balance || balance.available_balance < amount) {
      return { success: false, error: 'Saldo owner tidak mencukupi' }
    }

    // Create teacher payment record
    const { data: payment, error: dbError } = await supabase
      .from('teacher_payments')
      .insert({
        les_place_id: lesPlaceId,
        teacher_id: teacherId,
        owner_id: ownerId,
        amount: amount,
        payment_type: 'salary',
        payment_period: paymentPeriod,
        payment_status: 'processing',
        scheduled_date: new Date().toISOString().split('T')[0],
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Deduct from owner's balance
    await supabase
      .from('balances')
      .update({
        available_balance: balance.available_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', ownerId)

    // Add to teacher's balance
    const { data: teacherBalance } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', teacherId)
      .single()

    if (teacherBalance) {
      await supabase
        .from('balances')
        .update({
          total_balance: teacherBalance.total_balance + amount,
          available_balance: teacherBalance.available_balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', teacherId)
    } else {
      await supabase
        .from('balances')
        .insert({
          user_id: teacherId,
          les_place_id: lesPlaceId,
          total_balance: amount,
          available_balance: amount,
          pending_balance: 0
        })
    }

    // Mark payment as completed
    await supabase
      .from('teacher_payments')
      .update({
        payment_status: 'completed',
        paid_date: new Date().toISOString()
      })
      .eq('id', payment.id)

    return {
      success: true,
      payment: payment,
      message: 'Pembayaran gaji berhasil'
    }

  } catch (error) {
    console.error('Pay teacher salary error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get user's balance
 * @param {string} userId - User ID
 */
export async function getUserBalance(userId) {
  try {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      balance: data || {
        total_balance: 0,
        available_balance: 0,
        pending_balance: 0
      }
    }
  } catch (error) {
    console.error('Get balance error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get withdrawal history
 * @param {string} userId - User ID
 */
export async function getWithdrawalHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, withdrawals: data || [] }
  } catch (error) {
    console.error('Get withdrawal history error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// REFUND SYSTEM
// ============================================================

/**
 * Request a refund for a transaction
 * @param {Object} params - Refund parameters
 * @param {string} params.transactionId - Transaction ID
 * @param {string} params.studentId - Student requesting refund
 * @param {string} params.reason - Reason for refund
 */
export async function requestRefund({
  transactionId,
  studentId,
  reason = ''
}) {
  try {
    // Get transaction details
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('id, amount, payment_status, student_id, les_place_id')
      .eq('id', transactionId)
      .single()

    if (txnError || !txn) {
      return { success: false, error: 'Transaksi tidak ditemukan' }
    }

    // Validate student owns this transaction
    if (txn.student_id !== studentId) {
      return { success: false, error: 'Anda tidak memiliki akses ke transaksi ini' }
    }

    // Check if already refunded or pending refund
    const { data: existingRefund } = await supabase
      .from('refunds')
      .select('id')
      .eq('transaction_id', transactionId)
      .neq('status', 'rejected')
      .single()

    if (existingRefund) {
      return { success: false, error: 'Permintaan refund sudah ada untuk transaksi ini' }
    }

    // Create refund request
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        transaction_id: transactionId,
        student_id: studentId,
        les_place_id: txn.les_place_id,
        amount: txn.amount,
        reason: reason,
        status: 'pending'
      })
      .select()
      .single()

    if (refundError) throw refundError

    return {
      success: true,
      refund,
      message: 'Permintaan refund berhasil diajukan. Tunggu konfirmasi admin.'
    }

  } catch (error) {
    console.error('Request refund error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Process refund (Admin only)
 * @param {string} refundId - Refund ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} adminNote - Optional admin note
 */
export async function processRefund(refundId, action, adminNote = '') {
  try {
    // Get refund details
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select('*, transactions(id, student_id, amount, les_place_id, les_places(owner_id))')
      .eq('id', refundId)
      .single()

    if (refundError || !refund) {
      return { success: false, error: 'Refund tidak ditemukan' }
    }

    if (refund.status !== 'pending') {
      return { success: false, error: 'Refund sudah diproses sebelumnya' }
    }

    if (action === 'approve') {
      // Update refund status
      await supabase
        .from('refunds')
        .update({
          status: 'approved',
          admin_note: adminNote,
          processed_at: new Date().toISOString()
        })
        .eq('id', refundId)

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ payment_status: 'refunded' })
        .eq('id', refund.transaction_id)

      // Deduct from owner's balance (if they already received it)
      const ownerId = refund.transactions?.les_places?.owner_id
      if (ownerId) {
        const { data: balance } = await supabase
          .from('balances')
          .select('available_balance, total_balance')
          .eq('user_id', ownerId)
          .single()

        if (balance) {
          await supabase
            .from('balances')
            .update({
              total_balance: Math.max(0, balance.total_balance - refund.amount),
              available_balance: Math.max(0, balance.available_balance - refund.amount),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', ownerId)
        }
      }

      return {
        success: true,
        message: 'Refund berhasil disetujui. Dana akan dikembalikan ke siswa.'
      }

    } else if (action === 'reject') {
      await supabase
        .from('refunds')
        .update({
          status: 'rejected',
          admin_note: adminNote,
          processed_at: new Date().toISOString()
        })
        .eq('id', refundId)

      return {
        success: true,
        message: 'Refund ditolak.'
      }
    }

    return { success: false, error: 'Aksi tidak valid' }

  } catch (error) {
    console.error('Process refund error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get refund history for a user
 * @param {string} userId - User ID
 */
export async function getRefundHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*, transactions(midtrans_order_id, amount, description, les_places(name))')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, refunds: data || [] }
  } catch (error) {
    console.error('Get refund history error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all pending refunds (Admin)
 */
export async function getPendingRefunds() {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select('*, transactions(midtrans_order_id, amount, description, les_places(name)), students:student_id(users(name, email))')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, refunds: data || [] }
  } catch (error) {
    console.error('Get pending refunds error:', error)
    return { success: false, error: error.message }
  }
}

