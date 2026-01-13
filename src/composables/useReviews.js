import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useReviews() {
  const reviews = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Ambil ulasan untuk tempat les
  async function fetchReviews(lesPlaceId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('reviews')
        .select(`
          *,
          students (
            users (name, avatar_url)
          )
        `)
        .eq('les_place_id', lesPlaceId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })

      if (err) throw err
      reviews.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching reviews:', err)
    } finally {
      loading.value = false
    }
  }

  // Buat ulasan baru
  async function createReview(data) {
    loading.value = true
    error.value = null

    try {
      const { data: newReview, error: err } = await supabase
        .from('reviews')
        .insert(data)
        .select()
        .single()

      if (err) throw err
      return newReview
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Pemilik membalas ulasan
  async function replyToReview(id, reply) {
    loading.value = true
    error.value = null

    try {
      const { data: updated, error: err } = await supabase
        .from('reviews')
        .update({
          reply,
          replied_at: new Date().toISOString()
        })
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

  // Hapus ulasan (sembunyikan)
  async function deleteReview(id) {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('reviews')
        .update({ is_visible: false })
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
    reviews,
    loading,
    error,
    fetchReviews,
    createReview,
    replyToReview,
    deleteReview
  }
}
