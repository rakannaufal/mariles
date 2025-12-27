import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function usePrograms() {
  const programs = ref([])
  const program = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Fetch programs by les place ID
  async function fetchProgramsByLesPlace(lesPlaceId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('programs')
        .select(`
          *,
          categories (name, icon)
        `)
        .eq('les_place_id', lesPlaceId)
        .eq('is_active', true)
        .order('name')

      if (err) throw err
      programs.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching programs:', err)
    } finally {
      loading.value = false
    }
  }

  // Create new program
  async function createProgram(data) {
    loading.value = true
    error.value = null

    try {
      const { data: newProgram, error: err } = await supabase
        .from('programs')
        .insert(data)
        .select()
        .single()

      if (err) throw err
      return newProgram
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update program
  async function updateProgram(id, data) {
    loading.value = true
    error.value = null

    try {
      const { data: updated, error: err } = await supabase
        .from('programs')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return updated
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete program
  async function deleteProgram(id) {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('programs')
        .update({ is_active: false })
        .eq('id', id)

      if (err) throw err
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    programs,
    program,
    loading,
    error,
    fetchProgramsByLesPlace,
    createProgram,
    updateProgram,
    deleteProgram
  }
}
