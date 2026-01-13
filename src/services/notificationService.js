/**
 * Layanan Notifikasi
 * ==================
 * 
 * Menangani semua operasi notifikasi:
 * - Membuat notifikasi
 * - Mengambil notifikasi pengguna
 * - Menandai sudah dibaca
 * - Langganan real-time
 */

import { supabase } from '@/lib/supabase'

// ============================================================
// TIPE NOTIFIKASI
// ============================================================
export const NOTIFICATION_TYPES = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  NEW_STUDENT: 'new_student',
  NEW_MATERIAL: 'new_material',
  NEW_MESSAGE: 'new_message',
  REFUND_REQUESTED: 'refund_requested',
  REFUND_APPROVED: 'refund_approved',
  REFUND_REJECTED: 'refund_rejected',
  BOOKING_CONFIRMED: 'booking_confirmed',
  CLASS_REMINDER: 'class_reminder',
  VERIFICATION_APPROVED: 'verification_approved',
  SYSTEM: 'system'
}

// ============================================================
// BUAT NOTIFIKASI
// ============================================================

/**
 * Buat notifikasi untuk pengguna
 * @param {Object} params - Parameter notifikasi
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  data = {},
  link = null
}) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        link,
        is_read: false
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, notification }
  } catch (error) {
    console.error('Create notification error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Buat notifikasi untuk banyak pengguna
 * @param {string[]} userIds - Array ID pengguna
 * @param {Object} notificationData - Data notifikasi
 */
export async function createBulkNotifications(userIds, notificationData) {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      ...notificationData,
      is_read: false
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) throw error

    return { success: true, count: userIds.length }
  } catch (error) {
    console.error('Create bulk notifications error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// AMBIL NOTIFIKASI
// ============================================================

/**
 * Dapatkan notifikasi untuk pengguna
 * @param {string} userId - ID Pengguna
 * @param {number} limit - Jumlah notifikasi yang diambil
 */
export async function getNotifications(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, notifications: data || [] }
  } catch (error) {
    console.error('Get notifications error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dapatkan jumlah notifikasi belum dibaca
 * @param {string} userId - ID Pengguna
 */
export async function getUnreadCount(userId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error

    return { success: true, count: count || 0 }
  } catch (error) {
    console.error('Get unread count error:', error)
    return { success: false, error: error.message, count: 0 }
  }
}

// ============================================================
// TANDAI SUDAH DIBACA
// ============================================================

/**
 * Tandai satu notifikasi sudah dibaca
 * @param {string} notificationId - ID Notifikasi
 */
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Mark as read error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Tandai semua notifikasi sudah dibaca untuk pengguna
 * @param {string} userId - ID Pengguna
 */
export async function markAllAsRead(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Mark all as read error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// HAPUS NOTIFIKASI
// ============================================================

/**
 * Hapus notifikasi
 * @param {string} notificationId - ID Notifikasi
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Delete notification error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Hapus semua notifikasi untuk pengguna
 * @param {string} userId - ID Pengguna
 */
export async function clearAllNotifications(userId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Clear all notifications error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// LANGGANAN REAL-TIME
// ============================================================

/**
 * Berlangganan ke notifikasi real-time
 * @param {string} userId - ID Pengguna
 * @param {Function} callback - Fungsi callback saat notifikasi baru tiba
 * @returns {Object} Objek langganan dengan metode unsubscribe
 */
export function subscribeToNotifications(userId, callback) {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription)
    }
  }
}

// ============================================================
// FUNGSI PEMBANTU
// ============================================================

/**
 * Dapatkan ikon notifikasi berdasarkan tipe
 * @param {string} type - Tipe notifikasi
 */
export function getNotificationIcon(type) {
  const icons = {
    [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: '💰',
    [NOTIFICATION_TYPES.PAYMENT_FAILED]: '❌',
    [NOTIFICATION_TYPES.NEW_STUDENT]: '👨‍🎓',
    [NOTIFICATION_TYPES.NEW_MATERIAL]: '📚',
    [NOTIFICATION_TYPES.NEW_MESSAGE]: '💬',
    [NOTIFICATION_TYPES.REFUND_REQUESTED]: '🔄',
    [NOTIFICATION_TYPES.REFUND_APPROVED]: '✅',
    [NOTIFICATION_TYPES.REFUND_REJECTED]: '❌',
    [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: '📅',
    [NOTIFICATION_TYPES.CLASS_REMINDER]: '⏰',
    [NOTIFICATION_TYPES.VERIFICATION_APPROVED]: '✓',
    [NOTIFICATION_TYPES.SYSTEM]: '📢'
  }
  return icons[type] || '🔔'
}
