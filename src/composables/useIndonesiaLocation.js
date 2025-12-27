// Composable untuk mengambil data wilayah Indonesia dari API
// API: https://emsifa.github.io/api-wilayah-indonesia/

import { ref } from 'vue'

// Cache untuk menyimpan data yang sudah di-fetch
const provincesCache = ref([])
const citiesCache = ref({}) // { provinceId: cities[] }
const allCitiesCache = ref([])

export function useIndonesiaLocation() {
  const provinces = ref([])
  const cities = ref([])
  const allCities = ref([])
  
  const loadingProvinces = ref(false)
  const loadingCities = ref(false)
  const loadingAllCities = ref(false)
  
  const error = ref(null)

  // Fetch semua provinsi
  async function fetchProvinces() {
    // Gunakan cache jika ada
    if (provincesCache.value.length > 0) {
      provinces.value = provincesCache.value
      return provinces.value
    }
    
    loadingProvinces.value = true
    error.value = null
    
    try {
      const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      if (!res.ok) throw new Error('Failed to fetch provinces')
      
      const data = await res.json()
      provinces.value = data
      provincesCache.value = data
      return data
    } catch (err) {
      console.error('Error fetching provinces:', err)
      error.value = err.message
      // Fallback data
      provinces.value = getFallbackProvinces()
      return provinces.value
    } finally {
      loadingProvinces.value = false
    }
  }

  // Fetch kota/kabupaten berdasarkan provinsi
  async function fetchCities(provinceId) {
    if (!provinceId) {
      cities.value = []
      return []
    }
    
    // Gunakan cache jika ada
    if (citiesCache.value[provinceId]) {
      cities.value = citiesCache.value[provinceId]
      return cities.value
    }
    
    loadingCities.value = true
    error.value = null
    
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`)
      if (!res.ok) throw new Error('Failed to fetch cities')
      
      const data = await res.json()
      cities.value = data
      citiesCache.value[provinceId] = data
      return data
    } catch (err) {
      console.error('Error fetching cities:', err)
      error.value = err.message
      cities.value = []
      return []
    } finally {
      loadingCities.value = false
    }
  }

  // Fetch SEMUA kota/kabupaten dari seluruh Indonesia
  async function fetchAllCities() {
    // Gunakan cache jika ada
    if (allCitiesCache.value.length > 0) {
      allCities.value = allCitiesCache.value
      return allCities.value
    }
    
    loadingAllCities.value = true
    error.value = null
    
    try {
      // Fetch provinces dulu
      const provs = await fetchProvinces()
      
      // Fetch cities dari semua provinsi secara parallel
      const citiesPromises = provs.map(async (prov) => {
        try {
          const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${prov.id}.json`)
          if (!res.ok) return []
          const data = await res.json()
          // Tambahkan info provinsi ke setiap city
          return data.map(city => ({
            ...city,
            province_id: prov.id,
            province_name: prov.name
          }))
        } catch {
          return []
        }
      })
      
      const results = await Promise.all(citiesPromises)
      const allData = results.flat()
      
      // Sort berdasarkan nama
      allData.sort((a, b) => a.name.localeCompare(b.name))
      
      allCities.value = allData
      allCitiesCache.value = allData
      return allData
    } catch (err) {
      console.error('Error fetching all cities:', err)
      error.value = err.message
      return []
    } finally {
      loadingAllCities.value = false
    }
  }

  // Search cities by name (untuk autocomplete)
  function searchCities(query, limit = 20) {
    if (!query || query.length < 2) return []
    
    const searchTerm = query.toLowerCase()
    return allCities.value
      .filter(city => 
        city.name.toLowerCase().includes(searchTerm) ||
        city.province_name?.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit)
  }

  // Get province name by ID
  function getProvinceName(provinceId) {
    const prov = provinces.value.find(p => p.id === provinceId)
    return prov?.name || ''
  }

  // Get city name by ID
  function getCityName(cityId) {
    const city = allCities.value.find(c => c.id === cityId)
    return city?.name || ''
  }

  // Format city name (tanpa prefix KOTA/KABUPATEN)
  function formatCityName(name) {
    if (!name) return ''
    return name
      .replace(/^KOTA\s+/i, '')
      .replace(/^KABUPATEN\s+/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return {
    // State
    provinces,
    cities,
    allCities,
    loadingProvinces,
    loadingCities,
    loadingAllCities,
    error,
    
    // Methods
    fetchProvinces,
    fetchCities,
    fetchAllCities,
    searchCities,
    getProvinceName,
    getCityName,
    formatCityName
  }
}

// Fallback provinces jika API gagal
function getFallbackProvinces() {
  return [
    { id: '11', name: 'ACEH' },
    { id: '12', name: 'SUMATERA UTARA' },
    { id: '13', name: 'SUMATERA BARAT' },
    { id: '14', name: 'RIAU' },
    { id: '15', name: 'JAMBI' },
    { id: '16', name: 'SUMATERA SELATAN' },
    { id: '17', name: 'BENGKULU' },
    { id: '18', name: 'LAMPUNG' },
    { id: '19', name: 'KEPULAUAN BANGKA BELITUNG' },
    { id: '21', name: 'KEPULAUAN RIAU' },
    { id: '31', name: 'DKI JAKARTA' },
    { id: '32', name: 'JAWA BARAT' },
    { id: '33', name: 'JAWA TENGAH' },
    { id: '34', name: 'DI YOGYAKARTA' },
    { id: '35', name: 'JAWA TIMUR' },
    { id: '36', name: 'BANTEN' },
    { id: '51', name: 'BALI' },
    { id: '52', name: 'NUSA TENGGARA BARAT' },
    { id: '53', name: 'NUSA TENGGARA TIMUR' },
    { id: '61', name: 'KALIMANTAN BARAT' },
    { id: '62', name: 'KALIMANTAN TENGAH' },
    { id: '63', name: 'KALIMANTAN SELATAN' },
    { id: '64', name: 'KALIMANTAN TIMUR' },
    { id: '65', name: 'KALIMANTAN UTARA' },
    { id: '71', name: 'SULAWESI UTARA' },
    { id: '72', name: 'SULAWESI TENGAH' },
    { id: '73', name: 'SULAWESI SELATAN' },
    { id: '74', name: 'SULAWESI TENGGARA' },
    { id: '75', name: 'GORONTALO' },
    { id: '76', name: 'SULAWESI BARAT' },
    { id: '81', name: 'MALUKU' },
    { id: '82', name: 'MALUKU UTARA' },
    { id: '91', name: 'PAPUA BARAT' },
    { id: '94', name: 'PAPUA' }
  ]
}
