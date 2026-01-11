/**
 * Payment Service
 * ===============
 *
 * Handles all payment operations:
 * - Creating payments (Student → Owner)
 * - Processing withdrawals (Owner/Teacher → Bank)
 * - Payment status updates
 * - Platform revenue tracking
 *
 * Uses Midtrans for payment gateway integration.
 */

import { supabase } from "@/lib/supabase";
import MIDTRANS_CONFIG, {
  generateOrderId,
  openSnapPayment,
} from "@/lib/midtrans";
import { usePlatformSettings } from "@/composables/usePlatformSettings";
import {
  getAvailableBalance,
  isInHoldPeriod,
  isWithinRefundWindow,
} from "./balanceService";

// PLATFORM SETTINGS HELPER

const { getSetting } = usePlatformSettings();

/**
 * Load platform fee settings
 * @returns {Promise<Object>} Platform fee settings
 */
async function loadPlatformFees() {
  try {
    const fees = await getSetting("platform_fees");
    return (
      fees || {
        platform_fee_percent: 10,
        withdrawal_fee: 5000,
        min_withdrawal: 50000,
        max_withdrawal: 10000000,
      }
    );
  } catch (error) {
    console.error("Error loading platform fees:", error);
    return {
      platform_fee_percent: 10,
      withdrawal_fee: 5000,
      min_withdrawal: 50000,
      max_withdrawal: 10000000,
    };
  }
}

// PAYMENT CREATION (Student pays for class/program)

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
  description = "Pembayaran Kelas",
  customerDetails = {},
  preferredPayment = null,
}) {
  try {
    const orderId = generateOrderId("TXN");

    // Handle free payment (e.g. 100% discount or free course)
    if (amount <= 0) {
      const { data: transaction, error: dbError } = await supabase
        .from("transactions")
        .insert({
          les_place_id: lesPlaceId,
          student_id: studentId,
          booking_id: bookingId,
          program_id: programId,
          amount: 0,
          platform_fee: 0,
          net_amount: 0,
          payment_status: "completed", // Instantly completed
          midtrans_order_id: orderId,
          description: description,
          payment_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        success: true,
        transaction: transaction,
        orderId: orderId,
        isFree: true, // Flag to indicate free payment
      };
    }

    // Load dynamic platform fee from settings
    const feeSettings = await loadPlatformFees();
    const feePercent = feeSettings.platform_fee_percent / 100;
    const platformFee = Math.round(amount * feePercent);
    const netAmount = amount - platformFee;

    // REAL MODE - Use Supabase Edge Function

    // 1. Create transaction record in database
    const { data: transaction, error: dbError } = await supabase
      .from("transactions")
      .insert({
        les_place_id: lesPlaceId,
        student_id: studentId,
        booking_id: bookingId,
        program_id: programId,
        amount: amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        payment_status: "pending",
        midtrans_order_id: orderId,
        description: description,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Call Supabase Edge Function to create Snap Token
    const { data: snapData, error: funcError } =
      await supabase.functions.invoke("create-snap-token", {
        body: {
          orderId,
          amount,
          customerDetails,
          preferredPayment, // Pass the selected payment method
          itemDetails: [
            {
              id: programId || "program-1",
              price: amount,
              quantity: 1,
              name: description,
            },
          ],
        },
      });

    if (funcError) {
      console.error("Edge Function error:", funcError);
      throw new Error(funcError.message || "Gagal membuat snap token");
    }

    if (!snapData?.success) {
      throw new Error(snapData?.error || "Gagal membuat snap token");
    }

    // 3. Update transaction with snap token and hold period fields
    const now = new Date();
    await supabase
      .from("transactions")
      .update({
        snap_token: snapData.token,
        snap_redirect_url: snapData.redirect_url,
        hold_until: new Date(
          now.getTime() + 31 * 24 * 60 * 60 * 1000
        ).toISOString(),
        refund_deadline: new Date(
          now.getTime() + 90 * 24 * 60 * 60 * 1000
        ).toISOString(),
        lock_status: "active",
      })
      .eq("id", transaction.id);

    return {
      success: true,
      transaction: transaction,
      snapToken: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId: orderId,
    };
  } catch (error) {
    console.error("Create payment error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Open Midtrans Snap payment popup
 * @param {string} snapToken - Snap token from createPayment
 * @param {Function} onSuccess - Success callback
 * @param {Function} onPending - Pending callback
 * @param {Function} onError - Error callback
 */
export async function payWithSnap(
  snapToken,
  { onSuccess, onPending, onError, onClose }
) {
  try {
    await openSnapPayment(snapToken, {
      onSuccess: async (result) => {
        // Status diupdate oleh webhook, frontend hanya trigger callback
        // Ini mencegah fake payment dari Console Browser
        console.log(
          "Payment success callback, status will be updated by webhook"
        );
        onSuccess?.(result);
      },
      onPending: async (result) => {
        console.log(
          "Payment pending callback, status will be updated by webhook"
        );
        onPending?.(result);
      },
      onError: async (result) => {
        console.log(
          "Payment error callback, status will be updated by webhook"
        );
        onError?.(result);
      },
      onClose: () => {
        onClose?.();
      },
    });
  } catch (error) {
    console.error("Snap payment error:", error);
    onError?.({ error: error.message });
  }
}

/**
 * Update payment status after Midtrans callback
 * @param {string} orderId - Midtrans order ID
 * @param {string} status - New payment status
 * @param {Object} midtransResult - Midtrans response
 */
export async function updatePaymentStatus(
  orderId,
  status,
  midtransResult = {}
) {
  try {
    const updateData = {
      payment_status: status,
      midtrans_transaction_id: midtransResult.transaction_id,
      midtrans_payment_type: midtransResult.payment_type,
      midtrans_status_code: midtransResult.status_code,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updateData.payment_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("midtrans_order_id", orderId);

    if (error) throw error;

    // If completed, update owner's balance, increment students, and record revenue
    if (status === "completed") {
      await updateOwnerBalance(orderId);
      await incrementProgramStudents(orderId);
      await recordPlatformRevenue(orderId); // Record platform fee as revenue
    }

    return { success: true };
  } catch (error) {
    console.error("Update payment status error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Record platform fee as revenue
 * @param {string} orderId - Midtrans order ID
 */
async function recordPlatformRevenue(orderId) {
  try {
    // Get transaction details
    const { data: txn } = await supabase
      .from("transactions")
      .select("id, platform_fee, description, les_place_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn || txn.platform_fee <= 0) return;

    // Check if already recorded
    const { data: existing } = await supabase
      .from("platform_revenue")
      .select("id")
      .eq("transaction_id", txn.id)
      .single();

    if (existing) return; // Already recorded

    // Insert platform revenue record
    await supabase.from("platform_revenue").insert({
      transaction_id: txn.id,
      amount: txn.platform_fee,
      source: "platform_fee",
      description: `Komisi dari: ${txn.description || "Pembayaran"}`,
      les_place_id: txn.les_place_id,
    });

    console.log(
      `Platform revenue recorded: Rp ${txn.platform_fee} for order ${orderId}`
    );
  } catch (error) {
    console.error("Record platform revenue error:", error);
    // Don't throw - this shouldn't block the main flow
  }
}

/**
 * Update owner balance after successful payment
 */
async function updateOwnerBalance(orderId) {
  try {
    // Get transaction details
    const { data: txn } = await supabase
      .from("transactions")
      .select("les_place_id, net_amount, les_places(owner_id)")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn) return;

    const ownerId = txn.les_places?.owner_id;
    if (!ownerId) return;

    // Update or create balance
    const { data: existingBalance } = await supabase
      .from("balances")
      .select("*")
      .eq("user_id", ownerId)
      .single();

    if (existingBalance) {
      await supabase
        .from("balances")
        .update({
          total_balance: existingBalance.total_balance + txn.net_amount,
          available_balance: existingBalance.available_balance + txn.net_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", ownerId);
    } else {
      await supabase.from("balances").insert({
        user_id: ownerId,
        les_place_id: txn.les_place_id,
        total_balance: txn.net_amount,
        available_balance: txn.net_amount,
        pending_balance: 0,
      });
    }
  } catch (error) {
    console.error("Update owner balance error:", error);
  }
}

// WITHDRAWALS (Owner/Teacher → Bank)

/**
 * Increment program's current_students and les_place's total_students after successful payment
 */
async function incrementProgramStudents(orderId) {
  try {
    // Get transaction with program_id and les_place_id
    const { data: txn } = await supabase
      .from("transactions")
      .select("program_id, les_place_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn?.program_id) return;

    // Increment program's current_students
    const { data: program } = await supabase
      .from("programs")
      .select("current_students")
      .eq("id", txn.program_id)
      .single();

    await supabase
      .from("programs")
      .update({
        current_students: (program?.current_students || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.program_id);

    console.log(`Program ${txn.program_id} student count incremented`);

    // Also increment les_place's total_students
    if (txn.les_place_id) {
      const { data: lesPlace } = await supabase
        .from("les_places")
        .select("total_students")
        .eq("id", txn.les_place_id)
        .single();

      await supabase
        .from("les_places")
        .update({
          total_students: (lesPlace?.total_students || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", txn.les_place_id);

      console.log(`Les place ${txn.les_place_id} total students incremented`);
    }
  } catch (error) {
    console.error("Increment program students error:", error);
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
  bankHolder,
}) {
  try {
    // Load platform fee settings for validation
    const feeSettings = await loadPlatformFees();
    const { min_withdrawal, max_withdrawal, withdrawal_fee } = feeSettings;

    // Validate min/max withdrawal (frontend validation)
    if (amount < min_withdrawal) {
      return {
        success: false,
        error: `Minimal pencairan Rp ${min_withdrawal.toLocaleString("id-ID")}`,
      };
    }
    if (amount > max_withdrawal) {
      return {
        success: false,
        error: `Maksimal pencairan Rp ${max_withdrawal.toLocaleString(
          "id-ID"
        )}`,
      };
    }

    // ATOMIK: Menggunakan RPC untuk mencegah race condition
    // RPC function melakukan SELECT FOR UPDATE sehingga hanya 1
    // request yang bisa diproses pada saat bersamaan
    const { data, error } = await supabase.rpc("process_withdrawal", {
      p_user_id: userId,
      p_amount: amount,
      p_les_place_id: lesPlaceId,
      p_bank_name: bankName,
      p_bank_account: bankAccount,
      p_bank_holder: bankHolder,
      p_fee: withdrawal_fee,
    });

    if (error) {
      console.error("RPC error:", error);
      throw new Error(error.message);
    }

    // RPC returns JSON object with success/error
    if (!data.success) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      withdrawal: { id: data.withdrawal_id },
      message:
        data.message ||
        "Permintaan pencairan berhasil. Dana akan ditransfer dalam 1-3 hari kerja.",
    };
  } catch (error) {
    console.error("Request withdrawal error:", error);
    return { success: false, error: error.message };
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
    const USE_DUMMY = isDummyEnabled("payment");

    if (USE_DUMMY) {
      // Simulate Iris processing
      console.log("DUMMY MODE: Simulating Iris disbursement");

      // Update to processing
      await supabase
        .from("withdrawals")
        .update({
          status: "processing",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      // Simulate delay then complete
      setTimeout(async () => {
        await supabase
          .from("withdrawals")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            iris_reference_key: `IRIS-SIM-${Date.now()}`,
            iris_status: "completed",
          })
          .eq("id", withdrawalId);
      }, 3000);

      return {
        success: true,
        message: "Pencairan sedang diproses (simulasi)",
        reference: `IRIS-SIM-${Date.now()}`,
      };
    }

    // REAL MODE - Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(
      "process-disbursement",
      {
        body: {
          withdrawalId,
          action: "create_payout",
        },
      }
    );

    if (error) {
      console.error("Edge Function error:", error);
      throw new Error(error.message || "Gagal memproses pencairan");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Gagal memproses pencairan");
    }

    return {
      success: true,
      message: "Pencairan berhasil diproses",
      reference: data.reference,
      status: data.status,
    };
  } catch (error) {
    console.error("Process withdrawal error:", error);

    // Revert status on error
    await supabase
      .from("withdrawals")
      .update({ status: "failed" })
      .eq("id", withdrawalId);

    return { success: false, error: error.message };
  }
}

/**
 * Check withdrawal status from Midtrans Iris
 * @param {string} withdrawalId - Withdrawal record ID
 */
export async function checkWithdrawalStatus(withdrawalId) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "process-disbursement",
      {
        body: {
          withdrawalId,
          action: "check_status",
        },
      }
    );

    if (error) throw new Error(error.message);

    return {
      success: true,
      status: data?.status,
      irisStatus: data?.iris_status,
    };
  } catch (error) {
    console.error("Check withdrawal status error:", error);
    return { success: false, error: error.message };
  }
}

// TEACHER SALARY PAYMENT

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
  bankHolder,
}) {
  try {
    // Check owner's balance
    const { data: balance } = await supabase
      .from("balances")
      .select("available_balance")
      .eq("user_id", ownerId)
      .single();

    if (!balance || balance.available_balance < amount) {
      return { success: false, error: "Saldo owner tidak mencukupi" };
    }

    // Create teacher payment record
    const { data: payment, error: dbError } = await supabase
      .from("teacher_payments")
      .insert({
        les_place_id: lesPlaceId,
        teacher_id: teacherId,
        owner_id: ownerId,
        amount: amount,
        payment_type: "salary",
        payment_period: paymentPeriod,
        payment_status: "processing",
        scheduled_date: new Date().toISOString().split("T")[0],
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Deduct from owner's balance
    await supabase
      .from("balances")
      .update({
        available_balance: balance.available_balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", ownerId);

    // Add to teacher's balance
    const { data: teacherBalance } = await supabase
      .from("balances")
      .select("*")
      .eq("user_id", teacherId)
      .single();

    if (teacherBalance) {
      await supabase
        .from("balances")
        .update({
          total_balance: teacherBalance.total_balance + amount,
          available_balance: teacherBalance.available_balance + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", teacherId);
    } else {
      await supabase.from("balances").insert({
        user_id: teacherId,
        les_place_id: lesPlaceId,
        total_balance: amount,
        available_balance: amount,
        pending_balance: 0,
      });
    }

    // Mark payment as completed
    await supabase
      .from("teacher_payments")
      .update({
        payment_status: "completed",
        paid_date: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return {
      success: true,
      payment: payment,
      message: "Pembayaran gaji berhasil",
    };
  } catch (error) {
    console.error("Pay teacher salary error:", error);
    return { success: false, error: error.message };
  }
}

// UTILITY FUNCTIONS

/**
 * Get user's balance
 * @param {string} userId - User ID
 */
export async function getUserBalance(userId) {
  try {
    const { data, error } = await supabase
      .from("balances")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return {
      success: true,
      balance: data || {
        total_balance: 0,
        available_balance: 0,
        pending_balance: 0,
      },
    };
  } catch (error) {
    console.error("Get balance error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get withdrawal history
 * @param {string} userId - User ID
 */
export async function getWithdrawalHistory(userId) {
  try {
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, withdrawals: data || [] };
  } catch (error) {
    console.error("Get withdrawal history error:", error);
    return { success: false, error: error.message };
  }
}

// REFUND SYSTEM

/**
 * Request a refund for a transaction
 * @param {Object} params - Refund parameters
 * @param {string} params.transactionId - Transaction ID
 * @param {string} params.studentId - Student requesting refund
 * @param {string} params.reason - Reason for refund
 */
export async function requestRefund({ transactionId, studentId, reason = "" }) {
  try {
    // Get transaction details with refund window info
    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .select(
        "id, amount, payment_status, student_id, les_place_id, refund_deadline, hold_until, created_at"
      )
      .eq("id", transactionId)
      .single();

    if (txnError || !txn) {
      return { success: false, error: "Transaksi tidak ditemukan" };
    }

    // Validate student owns this transaction
    if (txn.student_id !== studentId) {
      return {
        success: false,
        error: "Anda tidak memiliki akses ke transaksi ini",
      };
    }

    // Check refund window (90 days) - with fallback to created_at if refund_deadline is null
    if (!isWithinRefundWindow(txn.refund_deadline, txn.created_at)) {
      return {
        success: false,
        error:
          "Window refund sudah habis. Refund hanya dapat diajukan dalam 90 hari setelah pembayaran.",
      };
    }

    // Check if already refunded or pending refund
    const { data: existingRefund } = await supabase
      .from("refunds")
      .select("id")
      .eq("transaction_id", transactionId)
      .neq("status", "rejected")
      .single();

    if (existingRefund) {
      return {
        success: false,
        error: "Permintaan refund sudah ada untuk transaksi ini",
      };
    }

    // Create refund request
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        transaction_id: transactionId,
        student_id: studentId,
        les_place_id: txn.les_place_id,
        amount: txn.amount,
        reason: reason,
        status: "pending",
      })
      .select()
      .single();

    if (refundError) throw refundError;

    return {
      success: true,
      refund,
      message: "Permintaan refund berhasil diajukan. Tunggu konfirmasi admin.",
    };
  } catch (error) {
    console.error("Request refund error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Process refund with hold period and window validation (Admin only)
 * @param {string} refundId - Refund ID
 * @returns {Promise<Object>} Result with success status
 */
export async function processRefund(refundId) {
  try {
    // Get refund with transaction details
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .select(
        `
        *,
        transactions (
          id,
          amount,
          net_amount,
          platform_fee,
          hold_until,
          refund_deadline,
          created_at,
          lock_status,
          les_place_id,
          les_places (
            owner_id
          )
        )
      `
      )
      .eq("id", refundId)
      .single();

    if (refundError || !refund) {
      return { success: false, error: "Refund tidak ditemukan" };
    }

    if (refund.status !== "pending") {
      return { success: false, error: "Refund sudah diproses sebelumnya" };
    }

    const txn = refund.transactions;

    // Check 1: Refund window validity (90 days) - with fallback to created_at
    if (!isWithinRefundWindow(txn.refund_deadline, txn.created_at)) {
      // Auto-reject expired refunds
      await supabase
        .from("refunds")
        .update({
          status: "rejected",
          admin_note: "Window refund sudah lewat (>90 hari)",
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundId);

      return {
        success: false,
        error:
          "Refund window sudah lewat. Maksimal 90 hari setelah pembayaran.",
      };
    }

    // Check 2: Hold period status
    const inHoldPeriod = isInHoldPeriod(txn.hold_until);

    if (!inHoldPeriod) {
      // After hold period - must check owner balance
      const ownerId = txn.les_places?.owner_id;
      if (!ownerId) {
        return { success: false, error: "Owner tidak ditemukan" };
      }

      const availableBalance = await getAvailableBalance(
        ownerId,
        txn.les_place_id
      );

      if (availableBalance < txn.net_amount) {
        // Insufficient balance - reject refund
        await supabase
          .from("refunds")
          .update({
            status: "rejected",
            admin_note: `Saldo owner tidak mencukupi (tersedia: Rp ${availableBalance}, dibutuhkan: Rp ${txn.net_amount})`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", refundId);

        return {
          success: false,
          error:
            "Saldo tempat les tidak mencukupi. Dana telah ditarik setelah hold period selesai.",
        };
      }
    }

    // Process approved refund
    const ownerId = txn.les_places?.owner_id;

    // 1. Deduct owner balance (net_amount = 90%)
    if (ownerId) {
      const { data: ownerBalance } = await supabase
        .from("balances")
        .select("available_balance, total_balance")
        .eq("user_id", ownerId)
        .eq("les_place_id", txn.les_place_id)
        .single();

      if (ownerBalance) {
        await supabase
          .from("balances")
          .update({
            total_balance: Math.max(
              0,
              ownerBalance.total_balance - txn.net_amount
            ),
            available_balance: Math.max(
              0,
              ownerBalance.available_balance - txn.net_amount
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", ownerId)
          .eq("les_place_id", txn.les_place_id);
      }
    }

    // 2. Deduct admin platform fee (10%)
    // TODO: Implement platform balance deduction if tracked

    // 3. Update transaction lock status
    await supabase
      .from("transactions")
      .update({
        lock_status: "refunded",
        payment_status: "refunded",
      })
      .eq("id", txn.id);

    // 4. Update refund status
    await supabase
      .from("refunds")
      .update({
        status: "approved",
        admin_note: inHoldPeriod
          ? "Disetujui (dalam hold period)"
          : "Disetujui (setelah hold period)",
        processed_at: new Date().toISOString(),
      })
      .eq("id", refundId);

    return {
      success: true,
      message: "Refund berhasil disetujui",
    };
  } catch (error) {
    console.error("Process refund error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get refund history for a user
 * @param {string} userId - User ID
 */
export async function getRefundHistory(userId) {
  try {
    const { data, error } = await supabase
      .from("refunds")
      .select(
        "*, transactions(midtrans_order_id, amount, description, les_places(name))"
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, refunds: data || [] };
  } catch (error) {
    console.error("Get refund history error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all pending refunds (Admin)
 */
export async function getPendingRefunds() {
  try {
    const { data, error } = await supabase
      .from("refunds")
      .select(
        "*, transactions(midtrans_order_id, amount, description, les_places(name)), students:student_id(users(name, email))"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return { success: true, refunds: data || [] };
  } catch (error) {
    console.error("Get pending refunds error:", error);
    return { success: false, error: error.message };
  }
}

// ADMIN REVENUE FUNCTIONS

/**
 * Get platform revenue statistics for admin dashboard
 * @returns {Promise<Object>} Revenue statistics
 */
export async function getAdminRevenueStats() {
  try {
    // Get total revenue
    const { data: totalData } = await supabase
      .from("platform_revenue")
      .select("amount");

    const totalRevenue =
      totalData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // Get this month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthData } = await supabase
      .from("platform_revenue")
      .select("amount")
      .gte("created_at", startOfMonth.toISOString());

    const monthRevenue =
      monthData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // Get today's revenue
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: todayData } = await supabase
      .from("platform_revenue")
      .select("amount")
      .gte("created_at", startOfDay.toISOString());

    const todayRevenue =
      todayData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // Get breakdown by source
    const { data: breakdownData } = await supabase
      .from("platform_revenue")
      .select("source, amount");

    const breakdown = {};
    breakdownData?.forEach((r) => {
      breakdown[r.source] = (breakdown[r.source] || 0) + Number(r.amount);
    });

    // Get total transactions count
    const { count: txnCount } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "completed");

    // Get pending withdrawals count
    const { count: pendingWithdrawals } = await supabase
      .from("withdrawals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get pending refunds count
    const { count: pendingRefunds } = await supabase
      .from("refunds")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return {
      success: true,
      stats: {
        totalRevenue,
        monthRevenue,
        todayRevenue,
        breakdown,
        completedTransactions: txnCount || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingRefunds: pendingRefunds || 0,
      },
    };
  } catch (error) {
    console.error("Get admin revenue stats error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get monthly revenue chart data for admin dashboard
 * @param {number} monthsCount - Number of months to retrieve
 * @returns {Promise<Object>} Chart data
 */
export async function getMonthlyRevenueChart(monthsCount = 6) {
  try {
    const months = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59
      );

      const { data } = await supabase
        .from("platform_revenue")
        .select("source, amount")
        .gte("created_at", date.toISOString())
        .lte("created_at", endDate.toISOString());

      const platformFee =
        data
          ?.filter((r) => r.source === "platform_fee")
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const withdrawalFee =
        data
          ?.filter((r) => r.source === "withdrawal_fee")
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      months.push({
        month: date.toLocaleString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        platformFee,
        withdrawalFee,
        total: platformFee + withdrawalFee,
      });
    }

    return { success: true, data: months };
  } catch (error) {
    console.error("Get monthly revenue chart error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Record withdrawal fee as platform revenue
 * @param {string} withdrawalId - Withdrawal ID
 * @param {number} fee - Fee amount
 * @param {string} lesPlaceId - Les place ID
 */
export async function recordWithdrawalFeeRevenue(
  withdrawalId,
  fee,
  lesPlaceId
) {
  try {
    if (fee <= 0) return;

    // Check if already recorded
    const { data: existing } = await supabase
      .from("platform_revenue")
      .select("id")
      .eq("withdrawal_id", withdrawalId)
      .single();

    if (existing) return;

    await supabase.from("platform_revenue").insert({
      withdrawal_id: withdrawalId,
      amount: fee,
      source: "withdrawal_fee",
      description: "Biaya pencairan",
      les_place_id: lesPlaceId,
    });

    console.log(`Withdrawal fee revenue recorded: Rp ${fee}`);
  } catch (error) {
    console.error("Record withdrawal fee revenue error:", error);
  }
}

/**
 * Get recent platform revenue transactions for admin
 * @param {number} limit - Number of records to retrieve
 */
export async function getRecentPlatformRevenue(limit = 20) {
  try {
    const { data, error } = await supabase
      .from("platform_revenue")
      .select(
        `
        *,
        transactions(midtrans_order_id, description),
        les_places(name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, revenue: data || [] };
  } catch (error) {
    console.error("Get recent platform revenue error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get teacher payment schedules that are due
 */
export async function getUpcomingTeacherPayments() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data, error } = await supabase
      .from("payment_schedules")
      .select(
        `
        *,
        teachers:teacher_id(users(name, email)),
        les_places(name)
      `
      )
      .eq("is_active", true)
      .lte("next_payment_date", nextWeek.toISOString().split("T")[0])
      .order("next_payment_date", { ascending: true });

    if (error) throw error;

    return { success: true, schedules: data || [] };
  } catch (error) {
    console.error("Get upcoming teacher payments error:", error);
    return { success: false, error: error.message };
  }
}
