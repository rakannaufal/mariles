// Konfigurasi untuk mode dummy data
// Data dibaca dari Supabase table platform_settings

import { supabase } from '@/lib/supabase'

// Cache value untuk menghindari query berulang dalam satu session
let cachedValue = null
let cacheLoaded = false

// Fungsi async untuk load dari database
export async function loadDummyDataSetting() {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'dummy_data_mode')
      .single()

    if (error) {
      console.log('Dummy data setting not found, using default (true)')
      cachedValue = true
    } else {
      cachedValue = data?.value?.enabled !== false // default true
    }
    cacheLoaded = true
    return cachedValue
  } catch (err) {
    console.error('Error loading dummy data setting:', err)
    cachedValue = true
    cacheLoaded = true
    return true
  }
}

// Fungsi sinkron untuk kompatibilitas dengan kode lama
// Akan return cached value atau default true
export const getUseDummyData = () => {
  if (cacheLoaded) {
    return cachedValue
  }
  // Jika belum di-load, return default true
  // dan trigger async load untuk next call
  loadDummyDataSetting()
  return true
}

// Set dummy data mode (save ke Supabase)
export const setUseDummyData = async (value) => {
  try {
    const user = (await supabase.auth.getUser()).data.user
    const { error } = await supabase
      .from('platform_settings')
      .update({ 
        value: { enabled: value },
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'dummy_data_mode')

    if (error) throw error
    
    cachedValue = value
    cacheLoaded = true
    return true
  } catch (err) {
    console.error('Error saving dummy data setting:', err)
    return false
  }
}

// Export constant untuk kompatibilitas (akan selalu true pada awal load)
export const USE_DUMMY_DATA = true
