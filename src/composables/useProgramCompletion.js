import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Composable for Program Completion System
 * Handles: gated content, auto-complete, manual complete, terminate
 */
export function useProgramCompletion() {
  const loading = ref(false)
  const error = ref(null)

  // ==================== GATED CONTENT ====================
  
  /**
   * Check if a specific material is unlocked for a student
   * @param {Object} material - The material object with unlock_type, session_number
   * @param {Array} attendanceRecords - Student's attendance records
   * @returns {boolean} - Whether the material is unlocked
   */
  function isContentUnlocked(material, attendanceRecords = []) {
    if (!material) return false
    
    const unlockType = material.unlock_type || 'always'
    
    // Always unlocked
    if (unlockType === 'always') return true
    
    // After specific date
    if (unlockType === 'after_date') {
      if (!material.unlock_after_date) return true
      return new Date() >= new Date(material.unlock_after_date)
    }
    
    // After attending session X
    if (unlockType === 'after_session') {
      const sessionNumber = material.session_number || 1
      const attendedCount = attendanceRecords.filter(a => 
        a.status === 'present' || a.status === 'late' || a.status === 'excused'
      ).length
      return attendedCount >= sessionNumber
    }
    
    // Manual unlock - check if explicitly unlocked (future feature)
    if (unlockType === 'manual') {
      return material.is_unlocked === true
    }
    
    return false
  }

  /**
   * Get all materials with unlock status for a program
   */
  async function getMaterialsWithUnlockStatus(programId, bookingId, studentId) {
    try {
      // Get materials
      const { data: materials, error: matErr } = await supabase
        .from('course_materials')
        .select('*')
        .eq('program_id', programId)
        .eq('is_active', true)
        .order('session_number', { ascending: true })
        .order('order_index', { ascending: true })
      
      if (matErr) throw matErr
      
      // Get attendance records
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('booking_id', bookingId)
      
      // Check unlock status for each material
      return materials.map(mat => ({
        ...mat,
        isUnlocked: isContentUnlocked(mat, attendance || []),
        requiredSessions: mat.session_number || 1,
        attendedSessions: (attendance || []).filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length
      }))
    } catch (err) {
      console.error('Error getting materials with unlock status:', err)
      return []
    }
  }

  // ==================== COMPLETION ELIGIBILITY ====================

  /**
   * Check if a booking is eligible for completion
   */
  async function checkCompletionEligibility(bookingId) {
    try {
      const { data, error: err } = await supabase
        .rpc('check_completion_eligibility', { p_booking_id: bookingId })
      
      if (err) throw err
      return data
    } catch (err) {
      console.error('Error checking eligibility:', err)
      return {
        can_complete: false,
        reasons: ['Error checking eligibility: ' + err.message]
      }
    }
  }

  /**
   * Calculate completion eligibility locally (fallback)
   */
  async function calculateEligibilityLocal(bookingId, programId, studentId, config = {}) {
    try {
      // Default config
      const settings = {
        require_attendance: config.require_attendance ?? true,
        min_attendance_percent: config.min_attendance_percent ?? 80,
        require_passing_grade: config.require_passing_grade ?? false,
        passing_grade: config.passing_grade ?? 70,
        allow_early_completion: config.allow_early_completion ?? false
      }
      
      // Get attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('booking_id', bookingId)
      
      const totalSessions = attendance?.length || 0
      const attendedSessions = (attendance || []).filter(a => 
        a.status === 'present' || a.status === 'late'
      ).length
      const attendancePercent = totalSessions > 0 
        ? Math.round((attendedSessions / totalSessions) * 100) 
        : 0
      
      // Get material progress
      const { data: materials } = await supabase
        .from('course_materials')
        .select('id')
        .eq('program_id', programId)
        .eq('is_active', true)
      
      const totalMaterials = materials?.length || 0
      
      const { data: progress } = await supabase
        .from('material_progress')
        .select('material_id, is_completed')
        .eq('student_id', studentId)
        .in('material_id', materials?.map(m => m.id) || [])
      
      const completedMaterials = (progress || []).filter(p => p.is_completed).length
      const progressPercent = totalMaterials > 0 
        ? Math.round((completedMaterials / totalMaterials) * 100) 
        : 100
      
      // Check requirements
      const reasons = []
      let canComplete = true
      
      if (settings.require_attendance && attendancePercent < settings.min_attendance_percent) {
        canComplete = false
        reasons.push(`Kehadiran ${attendancePercent}% < minimal ${settings.min_attendance_percent}%`)
      }
      
      if (progressPercent < 100) {
        canComplete = false
        reasons.push(`Progress materi ${progressPercent}% < 100%`)
      }
      
      return {
        can_complete: canComplete,
        attendance_percent: attendancePercent,
        progress_percent: progressPercent,
        attended_sessions: attendedSessions,
        total_sessions: totalSessions,
        completed_materials: completedMaterials,
        total_materials: totalMaterials,
        reasons
      }
    } catch (err) {
      console.error('Error calculating eligibility:', err)
      return { can_complete: false, reasons: [err.message] }
    }
  }

  // ==================== COMPLETE BOOKING ====================

  /**
   * Complete a booking (manual or auto)
   */
  async function completeBooking(bookingId, options = {}) {
    const {
      completionType = 'manual',
      completionResult = 'passed',
      notes = null,
      performedBy = null
    } = options
    
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase.rpc('complete_booking', {
        p_booking_id: bookingId,
        p_completion_type: completionType,
        p_completion_result: completionResult,
        p_notes: notes,
        p_performed_by: performedBy
      })
      
      if (err) throw err
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to complete booking')
      }
      
      return data
    } catch (err) {
      console.error('Error completing booking:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Complete booking locally (fallback if RPC fails)
   */
  async function completeBookingLocal(bookingId, options = {}) {
    const {
      completionType = 'manual',
      completionResult = 'passed',
      notes = null
    } = options
    
    try {
      loading.value = true
      
      const { error: err } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_type: completionType,
          completion_result: completionResult,
          completion_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
      
      if (err) throw err
      
      return { success: true }
    } catch (err) {
      console.error('Error completing booking locally:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // ==================== TERMINATE BOOKING ====================

  /**
   * Terminate a booking (dropout/3x absent)
   */
  async function terminateBooking(bookingId, reason, performedBy) {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: err } = await supabase.rpc('terminate_booking', {
        p_booking_id: bookingId,
        p_reason: reason,
        p_performed_by: performedBy
      })
      
      if (err) throw err
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to terminate booking')
      }
      
      return data
    } catch (err) {
      console.error('Error terminating booking:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Terminate booking locally (fallback)
   */
  async function terminateBookingLocal(bookingId, reason, performedBy) {
    try {
      loading.value = true
      
      const { error: err } = await supabase
        .from('bookings')
        .update({
          status: 'terminated',
          completed_at: new Date().toISOString(),
          completion_type: 'terminate',
          completion_result: 'dropout',
          terminated_reason: reason,
          terminated_by: performedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
      
      if (err) throw err
      
      return { success: true }
    } catch (err) {
      console.error('Error terminating locally:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // ==================== DROPOUT DETECTION ====================

  /**
   * Check if a student is eligible for terminate (3x absent)
   */
  async function checkDropoutEligibility(bookingId) {
    try {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status, session_date')
        .eq('booking_id', bookingId)
        .order('session_date', { ascending: false })
        .limit(10)
      
      if (!attendance || attendance.length < 3) {
        return { is_dropout_eligible: false, consecutive_absents: 0 }
      }
      
      // Count consecutive absents from most recent
      let consecutiveAbsents = 0
      for (const record of attendance) {
        if (record.status === 'absent') {
          consecutiveAbsents++
        } else {
          break
        }
      }
      
      return {
        is_dropout_eligible: consecutiveAbsents >= 3,
        consecutive_absents: consecutiveAbsents,
        last_attendance: attendance[0]?.session_date
      }
    } catch (err) {
      console.error('Error checking dropout eligibility:', err)
      return { is_dropout_eligible: false, consecutive_absents: 0 }
    }
  }

  // ==================== AUTO-COMPLETE CHECK ====================

  /**
   * Check and auto-complete if eligible
   * Call this after material progress update or attendance save
   */
  async function checkAndAutoComplete(bookingId, programConfig = {}) {
    try {
      // Get booking info
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, status, program_id, student_id')
        .eq('id', bookingId)
        .single()
      
      if (!booking || booking.status !== 'active') {
        return { auto_completed: false, reason: 'Booking not active' }
      }
      
      // Check eligibility
      const eligibility = await calculateEligibilityLocal(
        bookingId, 
        booking.program_id, 
        booking.student_id,
        programConfig
      )
      
      if (!eligibility.can_complete) {
        return { auto_completed: false, eligibility }
      }
      
      // Auto complete
      await completeBookingLocal(bookingId, {
        completionType: 'auto',
        completionResult: 'passed',
        notes: 'Auto-completed: Progress 100%, Kehadiran memenuhi syarat'
      })
      
      return { auto_completed: true, eligibility }
    } catch (err) {
      console.error('Error in auto-complete check:', err)
      return { auto_completed: false, error: err.message }
    }
  }

  // ==================== STUDENT LIST FOR TEACHER ====================

  /**
   * Get students with completion status for a teacher
   */
  async function getStudentsForCompletion(lesPlaceId) {
    try {
      loading.value = true
      
      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          start_date,
          end_date,
          completed_at,
          completion_type,
          completion_result,
          completion_notes,
          student:students!inner (
            id,
            user_id,
            users!inner (id, name, email, avatar_url)
          ),
          program:programs!inner (
            id,
            name,
            type,
            completion_config
          )
        `)
        .eq('les_place_id', lesPlaceId)
        .in('status', ['active', 'confirmed', 'completed', 'terminated'])
        .order('created_at', { ascending: false })
      
      if (err) throw err
      
      // Enrich with dropout check and eligibility
      const enrichedData = await Promise.all((data || []).map(async (booking) => {
        let dropoutInfo = { is_dropout_eligible: false, consecutive_absents: 0 }
        let eligibility = null
        
        if (booking.status === 'active') {
          dropoutInfo = await checkDropoutEligibility(booking.id)
          eligibility = await calculateEligibilityLocal(
            booking.id,
            booking.program.id,
            booking.student.id,
            booking.program.completion_config || {}
          )
        }
        
        return {
          ...booking,
          studentName: booking.student?.users?.name || 'Unknown',
          studentEmail: booking.student?.users?.email || '',
          studentAvatar: booking.student?.users?.avatar_url,
          programName: booking.program?.name || 'Unknown',
          programType: booking.program?.type || 'offline',
          ...dropoutInfo,
          eligibility
        }
      }))
      
      return enrichedData
    } catch (err) {
      console.error('Error getting students for completion:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    
    // Gated Content
    isContentUnlocked,
    getMaterialsWithUnlockStatus,
    
    // Completion
    checkCompletionEligibility,
    calculateEligibilityLocal,
    completeBooking,
    completeBookingLocal,
    
    // Terminate
    terminateBooking,
    terminateBookingLocal,
    checkDropoutEligibility,
    
    // Auto-complete
    checkAndAutoComplete,
    
    // Teacher features
    getStudentsForCompletion
  }
}
