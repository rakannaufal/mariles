/**
 * Layanan Pembayaran
 * ==================
 *
 * Menangani semua operasi pembayaran:
 * - Membuat pembayaran (Siswa → Pemilik)
 * - Memproses pencairan (Pemilik/Pengajar → Bank)
 * - Pembaruan status pembayaran
 * - Pelacakan pendapatan platform
 *
 * Menggunakan Midtrans untuk integrasi gateway pembayaran.
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

// HELPER PENGATURAN PLATFORM

const { getSetting } = usePlatformSettings();

/**
 * Muat pengaturan biaya platform
 * @returns {Promise<Object>} Pengaturan biaya platform
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

// PEMBUATAN PEMBAYARAN (Siswa membayar kelas/program)

/**
 * Buat transaksi pembayaran untuk booking siswa
 * @param {Object} params - Parameter pembayaran
 * @param {string} params.lesPlaceId - ID Tempat Les
 * @param {string} params.studentId - ID Pengguna Siswa
 * @param {string} params.bookingId - ID Booking (opsional)
 * @param {string} params.programId - ID Program
 * @param {number} params.amount - Jumlah pembayaran
 * @param {string} params.description - Deskripsi pembayaran
 * @param {Object} params.customerDetails - Info pelanggan untuk Midtrans
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

    // Tangani pembayaran gratis (misal diskon 100% atau kursus gratis)
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
          payment_status: "completed", // Langsung selesai
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
        isFree: true, // Flag untuk menandakan pembayaran gratis
      };
    }

    // Muat biaya platform dinamis dari pengaturan
    const feeSettings = await loadPlatformFees();
    const feePercent = feeSettings.platform_fee_percent / 100;
    const platformFee = Math.round(amount * feePercent);
    const netAmount = amount - platformFee;

    // MODE REAL - Gunakan Supabase Edge Function

    // 1. Buat catatan transaksi di database
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

    // 2. Panggil Supabase Edge Function untuk membuat Snap Token
    const { data: snapData, error: funcError } =
      await supabase.functions.invoke("create-snap-token", {
        body: {
          orderId,
          amount,
          customerDetails,
          preferredPayment, // Teruskan metode pembayaran yang dipilih
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

    // 3. Update transaksi dengan snap token dan field periode hold
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
 * Buka popup pembayaran Midtrans Snap
 * @param {string} snapToken - Snap token dari createPayment
 * @param {Function} onSuccess - Callback sukses
 * @param {Function} onPending - Callback pending
 * @param {Function} onError - Callback error
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
 * Update status pembayaran setelah callback Midtrans
 * @param {string} orderId - ID Order Midtrans
 * @param {string} status - Status pembayaran baru
 * @param {Object} midtransResult - Respons Midtrans
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

    // Jika selesai, update saldo pemilik, tambah siswa, dan catat pendapatan
    if (status === "completed") {
      await updateOwnerBalance(orderId);
      await incrementProgramStudents(orderId);
      await recordPlatformRevenue(orderId); // Catat biaya platform sebagai pendapatan
    }

    return { success: true };
  } catch (error) {
    console.error("Update payment status error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Catat biaya platform sebagai pendapatan
 * @param {string} orderId - ID Order Midtrans
 */
async function recordPlatformRevenue(orderId) {
  try {
    // Dapatkan detail transaksi
    const { data: txn } = await supabase
      .from("transactions")
      .select("id, platform_fee, description, les_place_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn || txn.platform_fee <= 0) return;

    // Cek jika sudah dicatat
    const { data: existing } = await supabase
      .from("platform_revenue")
      .select("id")
      .eq("transaction_id", txn.id)
      .single();

    if (existing) return; // Sudah dicatat

    // Masukkan catatan pendapatan platform
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
    // Jangan throw - ini tidak boleh memblokir alur utama
  }
}

/**
 * Update saldo pemilik setelah pembayaran berhasil
 */
async function updateOwnerBalance(orderId) {
  try {
    // Dapatkan detail transaksi
    const { data: txn } = await supabase
      .from("transactions")
      .select("les_place_id, net_amount, les_places(owner_id)")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn) return;

    const ownerId = txn.les_places?.owner_id;
    if (!ownerId) return;

    // Update atau buat saldo
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

// PENCAIRAN (Pemilik/Pengajar → Bank)

/**
 * Tambah current_students program dan total_students les_place setelah pembayaran sukses
 */
async function incrementProgramStudents(orderId) {
  try {
    // Dapatkan transaksi dengan program_id dan les_place_id
    const { data: txn } = await supabase
      .from("transactions")
      .select("program_id, les_place_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (!txn?.program_id) return;

    // Tambah current_students program
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

    // Juga tambah total_students les_place
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
 * Kurangi current_students program dan total_students les_place setelah pengembalian dana
 * @param {string} programId - ID Program
 * @param {string} lesPlaceId - ID Tempat Les
 */
async function decrementProgramStudents(programId, lesPlaceId) {
  try {
    if (!programId) return;

    // Kurangi current_students program
    const { data: program } = await supabase
      .from("programs")
      .select("current_students")
      .eq("id", programId)
      .single();

    if (program && program.current_students > 0) {
      await supabase
        .from("programs")
        .update({
          current_students: program.current_students - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", programId);
      
      console.log(`Program ${programId} student count decremented`);
    }

    // Juga kurangi total_students les_place
    if (lesPlaceId) {
      const { data: lesPlace } = await supabase
        .from("les_places")
        .select("total_students")
        .eq("id", lesPlaceId)
        .single();

      if (lesPlace && lesPlace.total_students > 0) {
        await supabase
          .from("les_places")
          .update({
            total_students: lesPlace.total_students - 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lesPlaceId);

        console.log(`Les place ${lesPlaceId} total students decremented`);
      }
    }
  } catch (error) {
    console.error("Decrement program students error:", error);
  }
}

/**
 * Minta pencairan
 * @param {Object} params - Parameter pencairan
 * @param {string} params.userId - User yang meminta pencairan
 * @param {string} params.lesPlaceId - ID Tempat Les (untuk pemilik)
 * @param {number} params.amount - Jumlah pencairan
 * @param {string} params.bankName - Nama bank
 * @param {string} params.bankAccount - Nomor rekening
 * @param {string} params.bankHolder - Nama pemilik rekening
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
    // Muat pengaturan biaya platform untuk validasi
    const feeSettings = await loadPlatformFees();
    const { min_withdrawal, max_withdrawal, withdrawal_fee } = feeSettings;

    // Validasi min/max pencairan (validasi frontend)
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
 * Proses pencairan via Midtrans Iris (Disbursement)
 * Memanggil Supabase Edge Function yang menangani Iris API
 * @param {string} withdrawalId - ID catatan pencairan
 */
export async function processWithdrawal(withdrawalId) {
  try {
    // Cek jika menggunakan mode dummy
    const USE_DUMMY = isDummyEnabled("payment");

    if (USE_DUMMY) {
      // Simulasikan pemrosesan Iris
      console.log("DUMMY MODE: Simulating Iris disbursement");

      // Update to processing
      await supabase
        .from("withdrawals")
        .update({
          status: "processing",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      // Simulasikan delay lalu selesaikan
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

    // MODE REAL - Panggil Supabase Edge Function
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

    // Kembalikan status saat error
    await supabase
      .from("withdrawals")
      .update({ status: "failed" })
      .eq("id", withdrawalId);

    return { success: false, error: error.message };
  }
}

/**
 * Cek status pencairan dari Midtrans Iris
 * @param {string} withdrawalId - ID catatan pencairan
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

// PEMBAYARAN GAJI PENGAJAR

/**
 * Bayar gaji pengajar dari saldo pemilik
 * @param {Object} params - Parameter pembayaran
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
    // Cek saldo pemilik
    const { data: balance } = await supabase
      .from("balances")
      .select("available_balance")
      .eq("user_id", ownerId)
      .single();

    if (!balance || balance.available_balance < amount) {
      return { success: false, error: "Saldo owner tidak mencukupi" };
    }

    // Buat catatan pembayaran pengajar
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

    // Kurangi dari saldo pemilik
    await supabase
      .from("balances")
      .update({
        available_balance: balance.available_balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", ownerId);

    // Tambah ke saldo pengajar
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

    // Tandai pembayaran sebagai selesai
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

// FUNGSI UTILITAS

/**
 * Dapatkan saldo pengguna
 * @param {string} userId - ID Pengguna
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
/**
 * Process refund with hold period and window validation (Admin only)
 * @param {string} refundId - Refund ID
 * @param {string} action - 'approved' or 'rejected'
 * @param {string} adminNote - Admin's reason or note
 * @returns {Promise<Object>} Result with success status
 */
export async function processRefund(refundId, action = 'approved', adminNote = '') {
  try {
    // Get refund with transaction details and Booking ID
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .select(
        `
        *,
        transactions (
          id,
          booking_id,
          program_id,
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

    // === HANDLE REJECTION ===
    if (action === 'rejected') {
      const { error: rejectError } = await supabase
        .from("refunds")
        .update({
          status: "rejected",
          admin_note: adminNote || "Ditolak oleh admin",
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundId);

      if (rejectError) throw rejectError;

      return {
        success: true,
        message: "Refund berhasil ditolak",
      };
    }

    // === HANDLE APPROVAL ===
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
        description: (txn.description || "") + " (REFUNDED)", // Optional: tag description
      })
      .eq("id", txn.id);

    // 4. Update refund status
    await supabase
      .from("refunds")
      .update({
        status: "approved",
        admin_note: adminNote || (inHoldPeriod
          ? "Disetujui (dalam hold period) - Dana akan dikembalikan otomatis saat settlement"
          : "Disetujui - Dana siap dikembalikan"),
        processed_at: new Date().toISOString(),
      })
      .eq("id", refundId);
      
    // 5. REVOKE BOOKING ACCESS (Set status to 'refunded')
    // This removes the student from class lists and frees up the slot
    let bookingIdToUpdate = txn.booking_id;
    
    // Fallback: If booking_id is null in transaction, find it from student + program
    if (!bookingIdToUpdate && refund.student_id && txn.program_id) {
      console.log("Booking ID not in transaction, searching by student_id and program_id...");
      
      // Get student record first
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", refund.student_id)
        .single();
      
      if (studentData) {
        const { data: booking } = await supabase
          .from("bookings")
          .select("id")
          .eq("student_id", studentData.id)
          .eq("program_id", txn.program_id)
          .in("status", ["active", "confirmed"])
          .single();
        
        if (booking) {
          bookingIdToUpdate = booking.id;
          console.log("Found booking via fallback:", bookingIdToUpdate);
        }
      }
    }
    
    if (bookingIdToUpdate) {
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "refunded",
          payment_status: "refunded",
          notes: "Refund disetujui - Akses kelas dicabut",
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingIdToUpdate);
      
      if (bookingError) {
        console.error("Error updating booking status:", bookingError);
      } else {
        console.log("Booking status updated to 'refunded' for ID:", bookingIdToUpdate);
      }
    } else {
      console.warn("No booking found to revoke access for refund:", refundId);
    }

    // 6. RETURN SLOT (Decrement student count)
    if (txn.program_id) {
      await decrementProgramStudents(txn.program_id, txn.les_place_id);
      console.log("Decremented student count for program:", txn.program_id);
    }

    return {
      success: true,
      message: "Refund berhasil disetujui dan akses kelas telah dicabut",
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
 * Get all refunds (Admin) - Pending, Approved, Rejected
 */
export async function getAllRefunds() {
  try {
    const { data, error } = await supabase
      .from("refunds")
      .select(
        "id, created_at, amount, reason, status, student_id, transaction_id, transactions(midtrans_order_id, amount, description, les_places(name), student:users(name, email))"
      )
      .order("created_at", { ascending: false }); // Newest first

    if (error) throw error;

    // Sort client-side to avoid ambiguous column error
    const sortedRefunds = (data || []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return { success: true, refunds: sortedRefunds };
  } catch (error) {
    console.error("Get pending refunds error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Repair old approved refunds that didn't update booking status
 * This is a one-time fix for data inconsistency
 * Uses multiple fallback strategies to find the correct booking
 * @returns {Promise<Object>} Result with count of fixed bookings
 */
export async function repairApprovedRefunds() {
  try {
    console.log("Starting repair of approved refunds...");
    
    // 1. Get all approved refunds with full transaction details
    const { data: approvedRefunds, error: refundError } = await supabase
      .from("refunds")
      .select(`
        id,
        student_id,
        les_place_id,
        transaction_id,
        created_at,
        transactions (
          id,
          booking_id,
          program_id,
          student_id,
          les_place_id,
          description
        )
      `)
      .eq("status", "approved");
    
    if (refundError) {
      console.error("Error fetching approved refunds:", refundError);
      throw refundError;
    }
    
    console.log(`Found ${approvedRefunds?.length || 0} approved refunds`);
    
    let fixedCount = 0;
    let errors = [];
    
    for (const refund of approvedRefunds || []) {
      try {
        const txn = refund.transactions;
        console.log(`Processing refund ${refund.id}:`, { txn, student_id: refund.student_id });
        
        let bookingIdToFix = txn?.booking_id;
        
        // STRATEGY 1: Use booking_id from transaction
        if (bookingIdToFix) {
          console.log(`Strategy 1: Found booking_id ${bookingIdToFix} in transaction`);
        }
        
        // STRATEGY 2: Find by student_id (from students table) and program_id
        if (!bookingIdToFix && txn?.program_id) {
          // Get student ID - try refund.student_id first (which is user_id)
          const userId = refund.student_id || txn?.student_id;
          
          if (userId) {
            console.log(`Strategy 2: Looking for booking with user_id ${userId} and program_id ${txn.program_id}`);
            
            const { data: studentData } = await supabase
              .from("students")
              .select("id")
              .eq("user_id", userId)
              .single();
            
            if (studentData) {
              const { data: booking } = await supabase
                .from("bookings")
                .select("id, status")
                .eq("student_id", studentData.id)
                .eq("program_id", txn.program_id)
                .neq("status", "refunded") // Not already refunded
                .neq("status", "cancelled")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
              
              if (booking) {
                bookingIdToFix = booking.id;
                console.log(`Strategy 2: Found booking ${bookingIdToFix}`);
              }
            }
          }
        }
        
        // STRATEGY 3: Find by les_place_id and student (from refund directly)  
        if (!bookingIdToFix && refund.les_place_id && refund.student_id) {
          console.log(`Strategy 3: Looking for booking with les_place_id ${refund.les_place_id}`);
          
          const { data: studentData } = await supabase
            .from("students")
            .select("id")
            .eq("user_id", refund.student_id)
            .single();
          
          if (studentData) {
            // Get programs for this les_place
            const { data: programs } = await supabase
              .from("programs")
              .select("id")
              .eq("les_place_id", refund.les_place_id);
            
            if (programs?.length) {
              const programIds = programs.map(p => p.id);
              
              const { data: booking } = await supabase
                .from("bookings")
                .select("id, status")
                .eq("student_id", studentData.id)
                .in("program_id", programIds)
                .neq("status", "refunded")
                .neq("status", "cancelled")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
              
              if (booking) {
                bookingIdToFix = booking.id;
                console.log(`Strategy 3: Found booking ${bookingIdToFix}`);
              }
            }
          }
        }
        
        // STRATEGY 4: Match by description (program name) from transaction
        if (!bookingIdToFix && txn?.description && refund.student_id) {
          console.log(`Strategy 4: Looking for booking by description: ${txn.description}`);
          
          const { data: studentData } = await supabase
            .from("students")
            .select("id")
            .eq("user_id", refund.student_id)
            .single();
          
          if (studentData) {
            // Extract program name from description (usually format: "Pembayaran Program Name")
            const descMatch = txn.description.match(/Pembayaran (.+)/i) || 
                              txn.description.match(/Program (.+)/i);
            const programName = descMatch ? descMatch[1].trim() : txn.description;
            
            const { data: programs } = await supabase
              .from("programs")
              .select("id")
              .ilike("name", `%${programName}%`);
            
            if (programs?.length) {
              const programIds = programs.map(p => p.id);
              
              const { data: booking } = await supabase
                .from("bookings")
                .select("id, status")
                .eq("student_id", studentData.id)
                .in("program_id", programIds)
                .neq("status", "refunded")
                .neq("status", "cancelled")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
              
              if (booking) {
                bookingIdToFix = booking.id;
                console.log(`Strategy 4: Found booking ${bookingIdToFix} via description match`);
              }
            }
          }
        }
        
        // Update booking if found
        if (bookingIdToFix) {
          const { data: currentBooking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", bookingIdToFix)
            .single();
          
          if (currentBooking && currentBooking.status !== "refunded") {
            const { error: updateError } = await supabase
              .from("bookings")
              .update({
                status: "refunded",
                payment_status: "refunded",
                notes: "Diperbaiki otomatis - Refund disetujui",
                updated_at: new Date().toISOString()
              })
              .eq("id", bookingIdToFix);
            
            if (updateError) {
              console.error(`Error updating booking ${bookingIdToFix}:`, updateError);
              errors.push({ refundId: refund.id, error: updateError.message });
            } else {
              console.log(`✓ Fixed booking ${bookingIdToFix} for refund ${refund.id}`);
              fixedCount++;
            }
          } else {
            console.log(`Booking ${bookingIdToFix} already refunded or not found`);
          }
        } else {
          console.log(`✗ No booking found for refund ${refund.id}`);
          errors.push({ refundId: refund.id, error: "Booking tidak ditemukan" });
        }
      } catch (innerError) {
        console.error(`Error processing refund ${refund.id}:`, innerError);
        errors.push({ refundId: refund.id, error: innerError.message });
      }
    }
    
    console.log(`Repair completed. Fixed ${fixedCount} bookings. Errors: ${errors.length}`);
    return { 
      success: true, 
      fixedCount, 
      errors,
      message: `Berhasil memperbaiki ${fixedCount} booking${errors.length > 0 ? ` (${errors.length} error)` : ''}`
    };
  } catch (error) {
    console.error("Repair approved refunds error:", error);
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

/**
 * Recalculate and Sync Owner Balance
 * Ensures properties in 'balances' table match transaction history.
 * Useful for fixing 'Saldo tidak ditemukan' errors.
 */
export async function recalculateOwnerBalance(userId, lesPlaceId) {
  try {
    // 1. Calculate Income (From Bookings - Source of Truth)
    // We use bookings instead of transactions because legacy data might be in bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        payment_status, 
        status, 
        programs!inner(price, les_place_id)
      `)
      .eq('programs.les_place_id', lesPlaceId)
      .in('payment_status', ['paid', 'settlement', 'capture', 'completed'])
      .in('status', ['active', 'confirmed']);
      
    const totalIncome = bookings?.reduce((sum, b) => {
      const price = b.programs?.price || 0;
      const net = Math.round(price * 0.9); // 10% Platform Fee
      return sum + net;
    }, 0) || 0;

    // 2. Calculate Teacher Payments
    const { data: payments } = await supabase
      .from('teacher_payments')
      .select('amount')
      .eq('owner_id', userId)
      .neq('payment_status', 'failed');
      
    const totalPayments = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

    // 3. Calculate Withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .neq('status', 'failed');
      
    const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) || 0;

    // 4. Final Balance
    const currentBalance = totalIncome - totalPayments - totalWithdrawals;
    
    // 5. Upsert to balances table
    const { error } = await supabase
       .from('balances')
       .upsert({
         user_id: userId,
         les_place_id: lesPlaceId,
         total_balance: currentBalance,
         available_balance: currentBalance, // Assuming all is available for now
         pending_balance: 0, 
         updated_at: new Date().toISOString()
       }, { onConflict: 'user_id' });
       
    if (error) throw error;
    
    console.log(`Balance synced for user ${userId}: Rp ${currentBalance}`);
    return { success: true, balance: currentBalance };
  } catch (err) {
    console.error('Recalculate balance error:', err);
    return { success: false, error: err.message };
  }
}
