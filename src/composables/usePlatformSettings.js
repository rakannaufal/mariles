// Composable untuk membaca platform settings dari Supabase
import { supabase } from '@/lib/supabase'

const defaultSettings = {
  platformInfo: {
    platform_name: 'Mariles',
    tagline: 'Platform Les Terbaik di Indonesia',
    support_email: 'support@mariles.id',
    support_phone: '+62 822 9904 4050',
    whatsapp_number: '+6282299044050'
  },
  platformFees: {
    platform_fee_percent: 10,
    withdrawal_fee: 5000,
    min_withdrawal: 50000,
    max_withdrawal: 10000000
  },
  maintenanceMode: {
    enabled: false,
    message: 'Platform sedang dalam perbaikan.'
  },
  dummyDataMode: {
    enabled: true
  }
}

// Cache untuk menghindari query berulang
let settingsCache = null
let cacheTimestamp = 0
const CACHE_DURATION = 5000 // 5 seconds

export function usePlatformSettings() {
  
  // Load all settings from Supabase
  async function loadSettings() {
    // Check cache
    if (settingsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return settingsCache
    }
    
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')

      if (error) throw error

      const result = { ...defaultSettings }
      if (data && data.length > 0) {
        data.forEach(setting => {
          if (setting.key === 'platform_info') result.platformInfo = { ...defaultSettings.platformInfo, ...setting.value }
          if (setting.key === 'platform_fees') result.platformFees = { ...defaultSettings.platformFees, ...setting.value }
          if (setting.key === 'maintenance_mode') result.maintenanceMode = { ...defaultSettings.maintenanceMode, ...setting.value }
          if (setting.key === 'dummy_data_mode') result.dummyDataMode = { ...defaultSettings.dummyDataMode, ...setting.value }
        })
      }
      
      settingsCache = result
      cacheTimestamp = Date.now()
      return result
    } catch (err) {
      console.error('Error loading settings from Supabase:', err)
      return defaultSettings
    }
  }

  // Get single setting value (blocking, use cache)
  async function getSetting(key) {
    const settings = await loadSettings()
    switch (key) {
      case 'maintenance_mode': return settings.maintenanceMode
      case 'dummy_data_mode': return settings.dummyDataMode
      case 'platform_info': return settings.platformInfo
      case 'platform_fees': return settings.platformFees
      default: return null
    }
  }

  // Check maintenance mode (async)
  async function isMaintenanceModeAsync() {
    const settings = await loadSettings()
    return settings.maintenanceMode?.enabled === true
  }

  // Check dummy data mode (async)
  async function isDummyDataModeAsync() {
    const settings = await loadSettings()
    return settings.dummyDataMode?.enabled !== false // default true
  }

  // Get maintenance message
  async function getMaintenanceMessage() {
    const settings = await loadSettings()
    return settings.maintenanceMode?.message || defaultSettings.maintenanceMode.message
  }

  // Get platform info
  async function getPlatformInfo() {
    const settings = await loadSettings()
    return settings.platformInfo
  }

  // Clear cache (call after saving settings)
  function clearCache() {
    settingsCache = null
    cacheTimestamp = 0
  }

  return {
    loadSettings,
    getSetting,
    isMaintenanceModeAsync,
    isDummyDataModeAsync,
    getMaintenanceMessage,
    getPlatformInfo,
    clearCache,
    defaultSettings
  }
}
