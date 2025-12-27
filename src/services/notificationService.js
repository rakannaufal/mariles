/**
 * Notification Service
 * ====================
 * 
 * Handles all notification operations:
 * - Creating notifications
 * - Fetching user notifications
 * - Marking as read
 * - Real-time subscriptions
 */

import { supabase } from '@/lib/supabase'

// ============================================================
// NOTIFICATION TYPES
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
// CREATE NOTIFICATION
// ============================================================

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
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
 * Create notifications for multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
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
// FETCH NOTIFICATIONS
// ============================================================

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of notifications to fetch
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
 * Get unread notification count
 * @param {string} userId - User ID
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
// MARK AS READ
// ============================================================

/**
 * Mark a single notification as read
 * @param {string} notificationId - Notification ID
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
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
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
// DELETE NOTIFICATIONS
// ============================================================

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
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
 * Clear all notifications for a user
 * @param {string} userId - User ID
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
// REAL-TIME SUBSCRIPTION
// ============================================================

/**
 * Subscribe to real-time notifications
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function when new notification arrives
 * @returns {Object} Subscription object with unsubscribe method
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
// HELPER FUNCTIONS
// ============================================================

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
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
