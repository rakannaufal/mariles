import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useFavorites() {
  const favorites = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch user's favorites
  async function fetchFavorites(userId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('favorites')
        .select(`
          *,
          les_places (
            id,
            name,
            address,
            city,
            type,
            photos,
            rating,
            total_reviews,
            total_students,
            programs (
              id,
              price
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (err) throw err
      favorites.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching favorites:', err)
    } finally {
      loading.value = false
    }
  }

  // Check if les place is favorited
  async function isFavorited(userId, lesPlaceId) {
    try {
      const { data, error: err } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('les_place_id', lesPlaceId)
        .single()

      if (err && err.code !== 'PGRST116') throw err
      return !!data
    } catch (err) {
      console.error('Error checking favorite:', err)
      return false
    }
  }

  // Add to favorites
  async function addFavorite(userId, lesPlaceId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          les_place_id: lesPlaceId
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove from favorites
  async function removeFavorite(userId, lesPlaceId) {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('les_place_id', lesPlaceId)

      if (err) throw err
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Toggle favorite
  async function toggleFavorite(userId, lesPlaceId) {
    const isFav = await isFavorited(userId, lesPlaceId)
    if (isFav) {
      await removeFavorite(userId, lesPlaceId)
      return false
    } else {
      await addFavorite(userId, lesPlaceId)
      return true
    }
  }

  return {
    favorites,
    loading,
    error,
    fetchFavorites,
    isFavorited,
    addFavorite,
    removeFavorite,
    toggleFavorite
  }
}
