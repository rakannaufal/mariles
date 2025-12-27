import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useCategories() {
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchCategories() {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (err) throw err
      categories.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching categories:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories
  }
}
