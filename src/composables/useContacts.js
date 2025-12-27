import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useContacts() {
  const loading = ref(false)
  const error = ref(null)

  async function submitContact(data) {
    loading.value = true
    error.value = null

    try {
      const { error: submitError } = await supabase
        .from('contacts')
        .insert({
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          status: 'unread'
        })

      if (submitError) throw submitError

      return { success: true }
    } catch (err) {
      error.value = err.message || 'Gagal mengirim pesan. Silakan coba lagi.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // For admin use - fetch all contacts
  async function fetchContacts(options = {}) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      return { data, success: true }
    } catch (err) {
      error.value = err.message
      return { data: null, success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // For admin use - update contact status
  async function updateContactStatus(id, status) {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status })
        .eq('id', id)

      if (updateError) throw updateError

      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    submitContact,
    fetchContacts,
    updateContactStatus
  }
}
